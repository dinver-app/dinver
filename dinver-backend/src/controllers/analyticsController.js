const { Op } = require('sequelize');
const {
  AnalyticsEvent,
  Restaurant,
  MenuItemTranslation,
  DrinkItemTranslation,
  VisitValidation,
  User,
  ClaimLog,
  Reservation,
} = require('../../models');

// Helper: Valid event types
const VALID_EVENT_TYPES = [
  'restaurant_view',
  'click_gallery',
  'click_reviews',
  'click_reserve',
  'click_menu',
  'click_menu_item',
  'click_phone',
  'click_map',
  'click_website',
  'scan_qr_code',
];

// Log an analytics event
const logAnalyticsEvent = async (req, res) => {
  try {
    const { restaurantId, eventType, metadata, source, session_id } = req.body;
    // Validate restaurantId
    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId is required' });
    }
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    // Validate eventType
    if (!eventType || !VALID_EVENT_TYPES.includes(eventType)) {
      return res.status(400).json({ error: 'Invalid or missing eventType' });
    }
    // Extract IP address
    const ip_address =
      req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    // Extract user agent
    const user_agent = req.headers['user-agent'] || null;
    // Determine source (prefer explicit, fallback to metadata)
    let eventSource = source || (metadata && metadata.source) || null;
    // Save event
    await AnalyticsEvent.create({
      restaurant_id: restaurantId,
      event_type: eventType,
      metadata: metadata || {},
      ip_address,
      user_agent,
      session_id,
      timestamp: new Date(),
      source: eventSource,
      userType: (metadata && metadata.userType) || req.body.userType || null,
    });
    res.status(201).json({ message: 'Event logged' });
  } catch (error) {
    console.error('Error logging analytics event:', error);
    res.status(500).json({ error: 'Failed to log analytics event' });
  }
};

// Helper za postotnu promjenu
function getChangePercentage(current, previous) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

// Napredni summary s periodima i unique sessionima
const getAnalyticsSummary = async (req, res) => {
  try {
    const { restaurantId, scope } = req.query;

    // Sigurnosna provjera - scope mora biti eksplicitno definiran
    if (!scope || !['single_restaurant', 'all_restaurants'].includes(scope)) {
      return res.status(400).json({
        error:
          'Scope parameter is required and must be either "single_restaurant" or "all_restaurants"',
      });
    }

    // Ako je scope single_restaurant, restaurantId je obavezan
    if (scope === 'single_restaurant' && !restaurantId) {
      return res.status(400).json({
        error: 'restaurantId is required when scope is "single_restaurant"',
      });
    }

    // Ako nema restaurantId, računamo za sve restorane (samo za all_restaurants scope)
    const whereClause = restaurantId ? { restaurant_id: restaurantId } : {};

    // Fetch all events (za jedan restoran ili sve restorane)
    const events = await AnalyticsEvent.findAll({
      where: whereClause,
      attributes: [
        'event_type',
        'timestamp',
        'session_id',
        'metadata',
        'source',
        'ip_address',
        'restaurant_id', // Dodajemo restaurant_id za slučaj da računamo za sve restorane
      ],
      raw: true,
    });

    // 1. Confirmed visits (VisitValidation)
    // Za svaki period izračunaj confirmed visits
    const confirmedVisitsByPeriod = {};
    const confirmedVisitsPrevByPeriod = {};
    const confirmedVisitsChange = {};

    // Prvo dohvati sve VisitValidation (za jedan restoran ili sve restorane)
    const visitValidationWhere = restaurantId ? { restaurantId } : {};
    const allVisitValidations = await VisitValidation.findAll({
      where: {
        ...visitValidationWhere,
        usedAt: { [Op.ne]: null }, // Koristimo usedAt umjesto isUsed
      },
      attributes: ['id', 'usedAt', 'createdAt', 'restaurantId'], // Koristimo usedAt umjesto expiresAt
      raw: true,
    });
    const periods = {
      today: (date) => date.toDateString() === new Date().toDateString(),
      yesterday: (date) => {
        const y = new Date();
        y.setDate(new Date().getDate() - 1);
        return date.toDateString() === y.toDateString();
      },
      last7: (date) => (new Date() - date) / 86400000 < 7,
      weekBefore: (date) =>
        (new Date() - date) / 86400000 >= 7 &&
        (new Date() - date) / 86400000 < 14,
      last30: (date) => (new Date() - date) / 86400000 < 30,
      monthBefore: (date) =>
        (new Date() - date) / 86400000 >= 30 &&
        (new Date() - date) / 86400000 < 60,
      last14: (date) => (new Date() - date) / 86400000 < 14,
      last60: (date) => (new Date() - date) / 86400000 < 60,
      all_time: (date) => true, // Uvijek true za sve datume
    };
    const periodKeys = [
      'today',
      'last7',
      'last14',
      'last30',
      'last60',
      'all_time',
    ];
    // Helper za agregaciju (mora biti prije svih poziva)
    function aggregate(events, keyFn, periodList = periodKeys) {
      const result = {};
      for (const period of periodList) {
        const filtered = events.filter((e) =>
          periods[period](new Date(e.timestamp || e.usedAt || e.createdAt)),
        );
        result[period] = keyFn(filtered);
      }
      return result;
    }
    for (const period of periodKeys) {
      // Koristi usedAt kao datum posjete (kada je stvarno potvrđena)
      confirmedVisitsByPeriod[period] = allVisitValidations.filter((v) => {
        const date = new Date(v.usedAt);
        return periods[period](date);
      }).length;
    }
    // Prethodni periodi
    confirmedVisitsPrevByPeriod.today = allVisitValidations.filter((v) => {
      const date = new Date(v.usedAt);
      return periods.yesterday(date);
    }).length;
    confirmedVisitsPrevByPeriod.last7 = allVisitValidations.filter((v) => {
      const date = new Date(v.usedAt);
      return periods.weekBefore(date);
    }).length;
    confirmedVisitsPrevByPeriod.last14 = allVisitValidations.filter((v) => {
      const date = new Date(v.usedAt);
      // 14 dana prije last14
      const now = new Date();
      const start = new Date(now);
      start.setDate(now.getDate() - 28);
      const end = new Date(now);
      end.setDate(now.getDate() - 14);
      return date >= start && date < end;
    }).length;
    confirmedVisitsPrevByPeriod.last30 = allVisitValidations.filter((v) => {
      const date = new Date(v.usedAt);
      return periods.monthBefore(date);
    }).length;
    confirmedVisitsPrevByPeriod.last60 = allVisitValidations.filter((v) => {
      const date = new Date(v.usedAt);
      // 30 dana prije last60
      const now = new Date();
      const start = new Date(now);
      start.setDate(now.getDate() - 90);
      const end = new Date(now);
      end.setDate(now.getDate() - 60);
      return date >= start && date < end;
    }).length;
    confirmedVisitsPrevByPeriod.all_time = allVisitValidations.filter((v) => {
      const date = new Date(v.usedAt);
      // Za all_time, prethodni period je zadnjih 30 dana kao referenca
      const now = new Date();
      const start = new Date(now);
      start.setDate(now.getDate() - 60);
      const end = new Date(now);
      end.setDate(now.getDate() - 30);
      return date >= start && date < end;
    }).length;
    // Promjene (trendovi)
    confirmedVisitsChange.today = getChangePercentage(
      confirmedVisitsByPeriod.today,
      confirmedVisitsPrevByPeriod.today,
    );
    confirmedVisitsChange.last7 = getChangePercentage(
      confirmedVisitsByPeriod.last7,
      confirmedVisitsPrevByPeriod.last7,
    );
    confirmedVisitsChange.last14 = getChangePercentage(
      confirmedVisitsByPeriod.last14,
      confirmedVisitsPrevByPeriod.last14,
    );
    confirmedVisitsChange.last30 = getChangePercentage(
      confirmedVisitsByPeriod.last30,
      confirmedVisitsPrevByPeriod.last30,
    );
    confirmedVisitsChange.last60 = getChangePercentage(
      confirmedVisitsByPeriod.last60,
      confirmedVisitsPrevByPeriod.last60,
    );
    confirmedVisitsChange.all_time = getChangePercentage(
      confirmedVisitsByPeriod.all_time,
      confirmedVisitsPrevByPeriod.all_time,
    );
    const confirmedVisits = confirmedVisitsByPeriod.last7; // Za backward kompatibilnost
    const confirmedVisitsSummary = {
      total: confirmedVisitsByPeriod,
      change: confirmedVisitsChange,
    };

    // 2. QR code scans (total i change po periodima)
    const qrScansByPeriod = {};
    const qrScansPrevByPeriod = {};
    const qrScansChange = {};
    const qrEvents = events.filter((e) => e.event_type === 'scan_qr_code');
    for (const period of periodKeys) {
      qrScansByPeriod[period] = qrEvents.filter((e) =>
        periods[period](new Date(e.timestamp)),
      ).length;
    }
    // Prethodni periodi za qr
    qrScansPrevByPeriod.today = qrEvents.filter((e) =>
      periods.yesterday(new Date(e.timestamp)),
    ).length;
    qrScansPrevByPeriod.last7 = qrEvents.filter((e) =>
      periods.weekBefore(new Date(e.timestamp)),
    ).length;
    qrScansPrevByPeriod.last14 = qrEvents.filter((e) => {
      const now = new Date();
      const start = new Date(now);
      start.setDate(now.getDate() - 28);
      const end = new Date(now);
      end.setDate(now.getDate() - 14);
      const d = new Date(e.timestamp);
      return d >= start && d < end;
    }).length;
    qrScansPrevByPeriod.last30 = qrEvents.filter((e) =>
      periods.monthBefore(new Date(e.timestamp)),
    ).length;
    qrScansPrevByPeriod.last60 = qrEvents.filter((e) => {
      const now = new Date();
      const start = new Date(now);
      start.setDate(now.getDate() - 90);
      const end = new Date(now);
      end.setDate(now.getDate() - 60);
      const d = new Date(e.timestamp);
      return d >= start && d < end;
    }).length;
    qrScansPrevByPeriod.all_time = qrEvents.filter((e) => {
      // Za all_time, prethodni period je zadnjih 30 dana kao referenca
      const now = new Date();
      const start = new Date(now);
      start.setDate(now.getDate() - 60);
      const end = new Date(now);
      end.setDate(now.getDate() - 30);
      const d = new Date(e.timestamp);
      return d >= start && d < end;
    }).length;
    qrScansChange.today = getChangePercentage(
      qrScansByPeriod.today,
      qrScansPrevByPeriod.today,
    );
    qrScansChange.last7 = getChangePercentage(
      qrScansByPeriod.last7,
      qrScansPrevByPeriod.last7,
    );
    qrScansChange.last14 = getChangePercentage(
      qrScansByPeriod.last14,
      qrScansPrevByPeriod.last14,
    );
    qrScansChange.last30 = getChangePercentage(
      qrScansByPeriod.last30,
      qrScansPrevByPeriod.last30,
    );
    qrScansChange.last60 = getChangePercentage(
      qrScansByPeriod.last60,
      qrScansPrevByPeriod.last60,
    );
    qrScansChange.all_time = getChangePercentage(
      qrScansByPeriod.all_time,
      qrScansPrevByPeriod.all_time,
    );
    const qrScansTotal = qrScansByPeriod.last7;
    const qrScansSummary = {
      total: qrScansByPeriod,
      change: qrScansChange,
    };

    // 1. Za svaki event_type (osim scan_qr_code)
    const eventsSummary = {};
    for (const type of VALID_EVENT_TYPES) {
      if (type === 'scan_qr_code') continue;
      const filteredEvents = events.filter((e) => e.event_type === type);
      // Trendovi
      const totalToday = filteredEvents.filter((e) =>
        periods.today(new Date(e.timestamp)),
      ).length;
      const totalYesterday = filteredEvents.filter((e) =>
        periods.yesterday(new Date(e.timestamp)),
      ).length;
      const totalLast7 = filteredEvents.filter((e) =>
        periods.last7(new Date(e.timestamp)),
      ).length;
      const totalWeekBefore = filteredEvents.filter((e) =>
        periods.weekBefore(new Date(e.timestamp)),
      ).length;
      const totalLast30 = filteredEvents.filter((e) =>
        periods.last30(new Date(e.timestamp)),
      ).length;
      const totalMonthBefore = filteredEvents.filter((e) =>
        periods.monthBefore(new Date(e.timestamp)),
      ).length;
      const uniqueToday = new Set(
        filteredEvents
          .filter((e) => periods.today(new Date(e.timestamp)))
          .map((e) => e.session_id || e.ip_address)
          .filter((id) => !!id),
      ).size;
      const uniqueYesterday = new Set(
        filteredEvents
          .filter((e) => periods.yesterday(new Date(e.timestamp)))
          .map((e) => e.session_id || e.ip_address)
          .filter((id) => !!id),
      ).size;
      const uniqueLast7 = new Set(
        filteredEvents
          .filter((e) => periods.last7(new Date(e.timestamp)))
          .map((e) => e.session_id || e.ip_address)
          .filter((id) => !!id),
      ).size;
      const uniqueWeekBefore = new Set(
        filteredEvents
          .filter((e) => periods.weekBefore(new Date(e.timestamp)))
          .map((e) => e.session_id || e.ip_address)
          .filter((id) => !!id),
      ).size;
      const uniqueLast30 = new Set(
        filteredEvents
          .filter((e) => periods.last30(new Date(e.timestamp)))
          .map((e) => e.session_id || e.ip_address)
          .filter((id) => !!id),
      ).size;
      const uniqueMonthBefore = new Set(
        filteredEvents
          .filter((e) => periods.monthBefore(new Date(e.timestamp)))
          .map((e) => e.session_id || e.ip_address)
          .filter((id) => !!id),
      ).size;
      eventsSummary[type] = {
        total: aggregate(filteredEvents, (arr) => arr.length),
        unique: aggregate(
          filteredEvents,
          (arr) =>
            new Set(
              arr.map((e) => e.session_id || e.ip_address).filter((id) => !!id),
            ).size,
        ),
        changeToday: getChangePercentage(totalToday, totalYesterday),
        change7: getChangePercentage(totalLast7, totalWeekBefore),
        change30: getChangePercentage(totalLast30, totalMonthBefore),
        uniqueChangeToday: getChangePercentage(uniqueToday, uniqueYesterday),
        uniqueChange7: getChangePercentage(uniqueLast7, uniqueWeekBefore),
        uniqueChange30: getChangePercentage(uniqueLast30, uniqueMonthBefore),
      };
    }

    // 2. Za svaki menu item
    const itemClicks = [];
    const itemClicksBySource = {};
    const menuEvents = events.filter(
      (e) =>
        e.event_type === 'click_menu_item' ||
        e.event_type === 'click.menu_item',
    );
    // Pronađi sve itemId-e
    const allItemIds = Array.from(
      new Set(menuEvents.map((e) => e.metadata?.itemId).filter(Boolean)),
    );

    // Dohvati sve nazive odjednom (batch)
    // Ako je restaurantId specificiran, dohvati samo za taj restoran
    // Ako nije, dohvati sve menu items iz svih restorana
    const menuItemTranslations = await MenuItemTranslation.findAll({
      where: {
        menuItemId: allItemIds,
        language: 'hr',
      },
      include: restaurantId
        ? [
            {
              model: require('../../models').MenuItem,
              as: 'menuItem',
              where: { restaurantId },
              required: true,
            },
          ]
        : [],
      attributes: ['menuItemId', 'name'],
      raw: true,
    });

    const drinkItemTranslations = await DrinkItemTranslation.findAll({
      where: {
        drinkItemId: allItemIds,
        language: 'hr',
      },
      include: restaurantId
        ? [
            {
              model: require('../../models').DrinkItem,
              as: 'drinkItem',
              where: { restaurantId },
              required: true,
            },
          ]
        : [],
      attributes: ['drinkItemId', 'name'],
      raw: true,
    });
    // Fallback na bilo koji jezik ako nema hr
    const missingMenuIds = allItemIds.filter(
      (id) => !menuItemTranslations.find((t) => t.menuItemId === id),
    );
    const fallbackMenuTranslations = missingMenuIds.length
      ? await MenuItemTranslation.findAll({
          where: { menuItemId: missingMenuIds },
          include: restaurantId
            ? [
                {
                  model: require('../../models').MenuItem,
                  as: 'menuItem',
                  where: { restaurantId },
                  required: true,
                },
              ]
            : [],
          attributes: ['menuItemId', 'name'],
          raw: true,
        })
      : [];
    const missingDrinkIds = allItemIds.filter(
      (id) =>
        !menuItemTranslations.find((t) => t.menuItemId === id) &&
        !drinkItemTranslations.find((t) => t.drinkItemId === id),
    );
    const fallbackDrinkTranslations = missingDrinkIds.length
      ? await DrinkItemTranslation.findAll({
          where: { drinkItemId: missingDrinkIds },
          include: restaurantId
            ? [
                {
                  model: require('../../models').DrinkItem,
                  as: 'drinkItem',
                  where: { restaurantId },
                  required: true,
                },
              ]
            : [],
          attributes: ['drinkItemId', 'name'],
          raw: true,
        })
      : [];
    // Mapiraj id -> name
    const idToName = {};
    menuItemTranslations.forEach((t) => (idToName[t.menuItemId] = t.name));
    drinkItemTranslations.forEach((t) => (idToName[t.drinkItemId] = t.name));
    fallbackMenuTranslations.forEach((t) => {
      if (!idToName[t.menuItemId]) idToName[t.menuItemId] = t.name;
    });
    fallbackDrinkTranslations.forEach((t) => {
      if (!idToName[t.drinkItemId]) idToName[t.drinkItemId] = t.name;
    });
    for (const itemId of allItemIds) {
      const itemEvents = menuEvents.filter(
        (e) => e.metadata?.itemId === itemId,
      );
      itemClicks.push({
        id: itemId,
        name: idToName[itemId] || itemId,
        total: aggregate(itemEvents, (arr) => arr.length),
        unique: aggregate(
          itemEvents,
          (arr) =>
            new Set(
              arr.map((e) => e.session_id || e.ip_address).filter((id) => !!id),
            ).size,
        ),
      });
      // Breakdown po source za ovaj item
      itemClicksBySource[itemId] = {};
      const sourcesForItem = Array.from(
        new Set(itemEvents.map((e) => e.source || 'unknown')),
      );
      for (const source of sourcesForItem) {
        const eventsForSource = itemEvents.filter(
          (e) => (e.source || 'unknown') === source,
        );
        itemClicksBySource[itemId][source] = {
          total: aggregate(eventsForSource, (arr) => arr.length),
          unique: aggregate(
            eventsForSource,
            (arr) =>
              new Set(
                arr
                  .map((e) => e.session_id || e.ip_address)
                  .filter((id) => !!id),
              ).size,
          ),
        };
      }
    }
    // Top 5 najklikanijih stavki menija (po last30)
    const topItems = [...itemClicks]
      .sort((a, b) => (b.total.last30 || 0) - (a.total.last30 || 0))
      .slice(0, 5);

    // 3. Breakdown po izvoru (source) - total i unique
    const sourceBreakdown = {};
    const sourceBreakdownUnique = {};
    events.forEach((e) => {
      const s = e.source || 'unknown';
      sourceBreakdown[s] = (sourceBreakdown[s] || 0) + 1;
    });

    // Unique breakdown po source-u
    for (const source of Object.keys(sourceBreakdown)) {
      const sourceEvents = events.filter(
        (e) => (e.source || 'unknown') === source,
      );
      const uniqueSet = new Set(
        sourceEvents
          .map((e) => e.session_id || e.ip_address)
          .filter((id) => !!id),
      );
      sourceBreakdownUnique[source] = uniqueSet.size;
    }

    // Breakdown po event_type - total i unique
    const sourceByEvent = {};
    const sourceByEventUnique = {};
    for (const type of VALID_EVENT_TYPES) {
      sourceByEvent[type] = {};
      sourceByEventUnique[type] = {};
      const typeEvents = events.filter((e) => e.event_type === type);

      typeEvents.forEach((e) => {
        const s = e.source || 'unknown';
        sourceByEvent[type][s] = (sourceByEvent[type][s] || 0) + 1;
      });

      // Unique po event type i source
      for (const source of Object.keys(sourceByEvent[type])) {
        const sourceEvents = typeEvents.filter(
          (e) => (e.source || 'unknown') === source,
        );
        const uniqueSet = new Set(
          sourceEvents
            .map((e) => e.session_id || e.ip_address)
            .filter((id) => !!id),
        );
        sourceByEventUnique[type][source] = uniqueSet.size;
      }
    }

    // 4. Breakdown po satu (byHour) - total i unique
    const byHour = {};
    const byHourUnique = {};
    const byHourSource = {};
    const byHourSourceUnique = {};

    for (const type of VALID_EVENT_TYPES) {
      byHour[type] = Array(24).fill(0);
      byHourUnique[type] = Array(24).fill(0);
      byHourSource[type] = {};
      byHourSourceUnique[type] = {};

      const typeEvents = events.filter((e) => e.event_type === type);

      typeEvents.forEach((e) => {
        const hour = new Date(e.timestamp).getHours();
        byHour[type][hour]++;

        const source = e.source || 'unknown';
        if (!byHourSource[type][source]) {
          byHourSource[type][source] = Array(24).fill(0);
          byHourSourceUnique[type][source] = Array(24).fill(0);
        }
        byHourSource[type][source][hour]++;
      });

      // Unique po satu za svaki event type
      for (let hour = 0; hour < 24; hour++) {
        const hourEvents = typeEvents.filter(
          (e) => new Date(e.timestamp).getHours() === hour,
        );
        const uniqueSet = new Set(
          hourEvents
            .map((e) => e.session_id || e.ip_address)
            .filter((id) => !!id),
        );
        byHourUnique[type][hour] = uniqueSet.size;
      }

      // Unique po satu i source za svaki event type
      for (const source of Object.keys(byHourSource[type])) {
        for (let hour = 0; hour < 24; hour++) {
          const hourEvents = typeEvents.filter(
            (e) =>
              new Date(e.timestamp).getHours() === hour &&
              (e.source || 'unknown') === source,
          );
          const uniqueSet = new Set(
            hourEvents
              .map((e) => e.session_id || e.ip_address)
              .filter((id) => !!id),
          );
          byHourSourceUnique[type][source][hour] = uniqueSet.size;
        }
      }
    }

    // 5. Globalni total klikova i pregleda
    const clicksTotal = events.filter((e) =>
      e.event_type.startsWith('click'),
    ).length;
    const viewsTotal = events.filter(
      (e) => e.event_type === 'restaurant_view',
    ).length;

    // 6. Breakdown po danu (byDate) - total i unique
    const byDate = {};
    const byDateUnique = {};
    events.forEach((e) => {
      const day = new Date(e.timestamp).toISOString().split('T')[0];
      byDate[day] = (byDate[day] || 0) + 1;
    });

    // Unique po danu
    for (const day of Object.keys(byDate)) {
      const dayEvents = events.filter(
        (e) => new Date(e.timestamp).toISOString().split('T')[0] === day,
      );
      const uniqueSet = new Set(
        dayEvents.map((e) => e.session_id || e.ip_address).filter((id) => !!id),
      );
      byDateUnique[day] = uniqueSet.size;
    }

    // Dinver KPI-jevi samo za all_restaurants scope
    let dinverStats = null;
    let dinverStatsChange = null;
    if (scope === 'all_restaurants') {
      // 1. Claimani restorani po periodima (prema ClaimLog.createdAt)
      const allClaimLogs = await ClaimLog.findAll({
        attributes: ['id', 'restaurantId', 'createdAt'],
        raw: true,
      });
      // 2. Gradovi s claimanim restoranima po periodima (preko place iz Restaurant)
      // 3. Broj usera po periodima (User.createdAt)
      const allUsers = await User.findAll({
        attributes: ['id', 'createdAt'],
        raw: true,
      });
      // 4. Broj completed rezervacija po periodima (Reservation.status === 'completed')
      const allCompletedReservations = await Reservation.findAll({
        where: { status: 'completed' },
        attributes: ['id', 'createdAt'],
        raw: true,
      });
      // Helper za claimane restorane (po periodu, unique restaurantId)
      const claimedRestaurantsByPeriod = {};
      const claimedRestaurantsPrevByPeriod = {};
      const claimedCitiesByPeriod = {};
      const claimedCitiesPrevByPeriod = {};
      const usersByPeriod = {};
      const usersPrevByPeriod = {};
      const completedReservationsByPeriod = {};
      const completedReservationsPrevByPeriod = {};

      for (const period of periodKeys) {
        // Svi claimLogovi u periodu
        const logsInPeriod = allClaimLogs.filter((log) =>
          periods[period](new Date(log.createdAt)),
        );
        // Unique restaurantId
        const uniqueRestaurantIds = Array.from(
          new Set(logsInPeriod.map((log) => log.restaurantId)),
        );
        claimedRestaurantsByPeriod[period] = uniqueRestaurantIds.length;

        // Dohvati gradove za te restorane
        if (uniqueRestaurantIds.length > 0) {
          const restaurants = await Restaurant.findAll({
            where: { id: uniqueRestaurantIds },
            attributes: ['id', 'place'],
            raw: true,
          });
          const uniqueCities = Array.from(
            new Set(restaurants.map((r) => r.place).filter(Boolean)),
          );
          claimedCitiesByPeriod[period] = uniqueCities.length;
        } else {
          claimedCitiesByPeriod[period] = 0;
        }
      }

      // Prethodni periodi za claimane restorane
      claimedRestaurantsPrevByPeriod.today = allClaimLogs.filter((log) =>
        periods.yesterday(new Date(log.createdAt)),
      ).length;
      claimedRestaurantsPrevByPeriod.last7 = allClaimLogs.filter((log) =>
        periods.weekBefore(new Date(log.createdAt)),
      ).length;
      claimedRestaurantsPrevByPeriod.last14 = allClaimLogs.filter((log) => {
        const now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() - 28);
        const end = new Date(now);
        end.setDate(now.getDate() - 14);
        const d = new Date(log.createdAt);
        return d >= start && d < end;
      }).length;
      claimedRestaurantsPrevByPeriod.last30 = allClaimLogs.filter((log) =>
        periods.monthBefore(new Date(log.createdAt)),
      ).length;
      claimedRestaurantsPrevByPeriod.last60 = allClaimLogs.filter((log) => {
        const now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() - 90);
        const end = new Date(now);
        end.setDate(now.getDate() - 60);
        const d = new Date(log.createdAt);
        return d >= start && d < end;
      }).length;
      claimedRestaurantsPrevByPeriod.all_time = allClaimLogs.filter((log) => {
        const now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() - 60);
        const end = new Date(now);
        end.setDate(now.getDate() - 30);
        const d = new Date(log.createdAt);
        return d >= start && d < end;
      }).length;

      // Prethodni periodi za gradove (pojednostavljeno - koristimo istu logiku kao za restorane)
      claimedCitiesPrevByPeriod.today = claimedRestaurantsPrevByPeriod.today;
      claimedCitiesPrevByPeriod.last7 = claimedRestaurantsPrevByPeriod.last7;
      claimedCitiesPrevByPeriod.last14 = claimedRestaurantsPrevByPeriod.last14;
      claimedCitiesPrevByPeriod.last30 = claimedRestaurantsPrevByPeriod.last30;
      claimedCitiesPrevByPeriod.last60 = claimedRestaurantsPrevByPeriod.last60;
      claimedCitiesPrevByPeriod.all_time =
        claimedRestaurantsPrevByPeriod.all_time;

      // Broj usera po periodima
      for (const period of periodKeys) {
        usersByPeriod[period] = allUsers.filter((u) =>
          periods[period](new Date(u.createdAt)),
        ).length;
      }

      // Prethodni periodi za usere
      usersPrevByPeriod.today = allUsers.filter((u) =>
        periods.yesterday(new Date(u.createdAt)),
      ).length;
      usersPrevByPeriod.last7 = allUsers.filter((u) =>
        periods.weekBefore(new Date(u.createdAt)),
      ).length;
      usersPrevByPeriod.last14 = allUsers.filter((u) => {
        const now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() - 28);
        const end = new Date(now);
        end.setDate(now.getDate() - 14);
        const d = new Date(u.createdAt);
        return d >= start && d < end;
      }).length;
      usersPrevByPeriod.last30 = allUsers.filter((u) =>
        periods.monthBefore(new Date(u.createdAt)),
      ).length;
      usersPrevByPeriod.last60 = allUsers.filter((u) => {
        const now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() - 90);
        const end = new Date(now);
        end.setDate(now.getDate() - 60);
        const d = new Date(u.createdAt);
        return d >= start && d < end;
      }).length;
      usersPrevByPeriod.all_time = allUsers.filter((u) => {
        const now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() - 60);
        const end = new Date(now);
        end.setDate(now.getDate() - 30);
        const d = new Date(u.createdAt);
        return d >= start && d < end;
      }).length;

      // Broj completed rezervacija po periodima
      for (const period of periodKeys) {
        completedReservationsByPeriod[period] = allCompletedReservations.filter(
          (r) => periods[period](new Date(r.createdAt)),
        ).length;
      }

      // Prethodni periodi za completed rezervacije
      completedReservationsPrevByPeriod.today = allCompletedReservations.filter(
        (r) => periods.yesterday(new Date(r.createdAt)),
      ).length;
      completedReservationsPrevByPeriod.last7 = allCompletedReservations.filter(
        (r) => periods.weekBefore(new Date(r.createdAt)),
      ).length;
      completedReservationsPrevByPeriod.last14 =
        allCompletedReservations.filter((r) => {
          const now = new Date();
          const start = new Date(now);
          start.setDate(now.getDate() - 28);
          const end = new Date(now);
          end.setDate(now.getDate() - 14);
          const d = new Date(r.createdAt);
          return d >= start && d < end;
        }).length;
      completedReservationsPrevByPeriod.last30 =
        allCompletedReservations.filter((r) =>
          periods.monthBefore(new Date(r.createdAt)),
        ).length;
      completedReservationsPrevByPeriod.last60 =
        allCompletedReservations.filter((r) => {
          const now = new Date();
          const start = new Date(now);
          start.setDate(now.getDate() - 90);
          const end = new Date(now);
          end.setDate(now.getDate() - 60);
          const d = new Date(r.createdAt);
          return d >= start && d < end;
        }).length;
      completedReservationsPrevByPeriod.all_time =
        allCompletedReservations.filter((r) => {
          const now = new Date();
          const start = new Date(now);
          start.setDate(now.getDate() - 60);
          const end = new Date(now);
          end.setDate(now.getDate() - 30);
          const d = new Date(r.createdAt);
          return d >= start && d < end;
        }).length;

      // Računanje promjena (trendova)
      const claimedRestaurantsChange = {};
      const claimedCitiesChange = {};
      const usersChange = {};
      const completedReservationsChange = {};

      for (const period of periodKeys) {
        claimedRestaurantsChange[period] = getChangePercentage(
          claimedRestaurantsByPeriod[period],
          claimedRestaurantsPrevByPeriod[period],
        );
        claimedCitiesChange[period] = getChangePercentage(
          claimedCitiesByPeriod[period],
          claimedCitiesPrevByPeriod[period],
        );
        usersChange[period] = getChangePercentage(
          usersByPeriod[period],
          usersPrevByPeriod[period],
        );
        completedReservationsChange[period] = getChangePercentage(
          completedReservationsByPeriod[period],
          completedReservationsPrevByPeriod[period],
        );
      }

      dinverStats = {
        claimedRestaurants: claimedRestaurantsByPeriod,
        claimedCities: claimedCitiesByPeriod,
        users: usersByPeriod,
        completedReservations: completedReservationsByPeriod,
      };

      dinverStatsChange = {
        claimedRestaurants: claimedRestaurantsChange,
        claimedCities: claimedCitiesChange,
        users: usersChange,
        completedReservations: completedReservationsChange,
      };
    }

    res.json({
      periods: periodKeys,
      events: eventsSummary,
      itemClicks,
      topItems,
      itemClicksBySource,
      sourceBreakdown,
      sourceBreakdownUnique,
      sourceByEvent,
      sourceByEventUnique,
      byHour,
      byHourUnique,
      byHourSource,
      byHourSourceUnique,
      clicksTotal,
      viewsTotal,
      byDate,
      byDateUnique,
      confirmedVisits,
      confirmedVisitsSummary,
      qrScansTotal,
      qrScansSummary,
      scope,
      restaurantId: restaurantId || null,
      dinverStats,
      dinverStatsChange,
    });
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    res.status(500).json({ error: 'Failed to fetch analytics summary' });
  }
};

module.exports = {
  logAnalyticsEvent,
  getAnalyticsSummary,
};
