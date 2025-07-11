const { Op, Sequelize } = require('sequelize');
const {
  AnalyticsEvent,
  Restaurant,
  MenuItemTranslation,
  DrinkItemTranslation,
  VisitValidation,
  User,
  Reservation,
  ClaimLog,
} = require('../../models');
const { calculateDistance } = require('../../utils/distance');

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

// Helper za filtriranje po periodu
const PERIODS = ['today', 'last7', 'last30', 'all_time'];
const SOURCES = ['all', 'web', 'app'];

function periodFilter(date, period) {
  const now = new Date();
  const d = new Date(date);
  if (period === 'today') return d.toDateString() === now.toDateString();
  if (period === 'last7') return (now - d) / 86400000 < 7;
  if (period === 'last30') return (now - d) / 86400000 < 30;
  if (period === 'all_time') return true;
  return false;
}

const getAnalyticsSummary = async (req, res) => {
  try {
    const { restaurantId, scope } = req.query;
    if (!scope || !['single_restaurant', 'all_restaurants'].includes(scope)) {
      return res.status(400).json({
        error:
          'Scope parameter is required and must be either "single_restaurant" or "all_restaurants"',
      });
    }
    if (scope === 'single_restaurant' && !restaurantId) {
      return res.status(400).json({
        error: 'restaurantId is required when scope is "single_restaurant"',
      });
    }
    const whereClause = restaurantId ? { restaurant_id: restaurantId } : {};
    const events = await AnalyticsEvent.findAll({
      where: whereClause,
      attributes: [
        'event_type',
        'timestamp',
        'session_id',
        'metadata',
        'source',
        'ip_address',
        'restaurant_id',
      ],
      raw: true,
    });
    // Helper za source
    const getSource = (e) => {
      if (!e.source) return 'unknown';
      if (e.source === 'web' || e.source === 'app') return e.source;
      return 'unknown';
    };
    // Helper za filtriranje po sourceu
    const filterBySource = (arr, source) => {
      if (source === 'all') return arr;
      return arr.filter((e) => getSource(e) === source);
    };
    // --- SUMMARY ---
    const summary = {};
    // Views, Clicks, Visits, QR Scans
    const metricMap = {
      views: ['restaurant_view'],
      clicks: [
        'click_gallery',
        'click_reviews',
        'click_reserve',
        'click_menu',
        'click_menu_item',
        'click_phone',
        'click_map',
        'click_website',
      ],
      visits: [], // special below
      qr_scans: ['scan_qr_code'],
    };
    // Visits (confirmed)
    const visitValidationWhere = restaurantId ? { restaurantId } : {};
    const allVisitValidations = await VisitValidation.findAll({
      where: {
        ...visitValidationWhere,
        usedAt: { [Op.ne]: null },
      },
      attributes: ['id', 'usedAt', 'userId'],
      raw: true,
    });
    for (const metric of Object.keys(metricMap)) {
      summary[metric] = {};
      for (const period of PERIODS) {
        summary[metric][period] = { total: {}, unique: {} };
        if (metric === 'visits') {
          // Visits NEMA breakdown po sourceu, samo 'all'
          let filtered = allVisitValidations.filter((v) =>
            periodFilter(v.usedAt, period),
          );
          summary[metric][period].total['all'] = filtered.length;
          summary[metric][period].unique['all'] = new Set(
            filtered.map((e) => e.userId || e.id).filter(Boolean),
          ).size;
          // Ostali sourcevi su uvijek 0
          for (const source of SOURCES) {
            if (source !== 'all') {
              summary[metric][period].total[source] = 0;
              summary[metric][period].unique[source] = 0;
            }
          }
        } else {
          for (const source of SOURCES) {
            let filtered = events.filter(
              (e) =>
                metricMap[metric].includes(e.event_type) &&
                periodFilter(e.timestamp, period),
            );
            filtered = filterBySource(filtered, source);
            summary[metric][period].total[source] = filtered.length;
            summary[metric][period].unique[source] = new Set(
              filtered.map((e) => e.session_id).filter(Boolean),
            ).size;
          }
        }
      }
    }
    // --- SOURCE DISTRIBUTION ---
    const sourceDistribution = {};
    for (const period of PERIODS) {
      sourceDistribution[period] = { total: {}, unique: {} };
      for (const source of SOURCES.filter((s) => s !== 'all')) {
        const filtered = events.filter(
          (e) => periodFilter(e.timestamp, period) && getSource(e) === source,
        );
        sourceDistribution[period].total[source] = filtered.length;
        sourceDistribution[period].unique[source] = new Set(
          filtered.map((e) => e.session_id).filter(Boolean),
        ).size;
      }
    }
    // --- HOURLY ACTIVITY ---
    const hourlyActivity = {};
    for (const period of PERIODS) {
      hourlyActivity[period] = { total: {}, unique: {} };
      for (const source of SOURCES) {
        const arr = Array(24).fill(0);
        const arrUnique = Array(24).fill(0);
        let filtered = events.filter((e) => periodFilter(e.timestamp, period));
        filtered = filterBySource(filtered, source);
        for (let h = 0; h < 24; h++) {
          const hourEvents = filtered.filter(
            (e) => new Date(e.timestamp).getHours() === h,
          );
          arr[h] = hourEvents.length;
          arrUnique[h] = new Set(
            hourEvents.map((e) => e.session_id).filter(Boolean),
          ).size;
        }
        hourlyActivity[period].total[source] = arr;
        hourlyActivity[period].unique[source] = arrUnique;
      }
    }
    // --- DAILY ACTIVITY (last 30 days) ---
    const dailyActivity = { last30: { total: {}, unique: {} } };
    const now = new Date();
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }
    for (const source of SOURCES) {
      dailyActivity.last30.total[source] = {};
      dailyActivity.last30.unique[source] = {};
      for (const day of days) {
        let filtered = events.filter(
          (e) =>
            e.timestamp &&
            new Date(e.timestamp).toISOString().split('T')[0] === day,
        );
        filtered = filterBySource(filtered, source);
        dailyActivity.last30.total[source][day] = filtered.length;
        dailyActivity.last30.unique[source][day] = new Set(
          filtered.map((e) => e.session_id).filter(Boolean),
        ).size;
      }
    }
    // --- EVENTS (by event_type) ---
    const eventsSummary = {};
    for (const type of VALID_EVENT_TYPES) {
      eventsSummary[type] = {};
      for (const period of PERIODS) {
        eventsSummary[type][period] = { total: {}, unique: {} };
        for (const source of SOURCES) {
          let filtered = events.filter(
            (e) => e.event_type === type && periodFilter(e.timestamp, period),
          );
          filtered = filterBySource(filtered, source);
          eventsSummary[type][period].total[source] = filtered.length;
          eventsSummary[type][period].unique[source] = new Set(
            filtered.map((e) => e.session_id).filter(Boolean),
          ).size;
        }
      }
    }
    // --- TOP MENU ITEMS (za sve periode, max 6) ---
    const topMenuItems = {};
    for (const period of PERIODS) {
      const menuEvents = events.filter(
        (e) =>
          (e.event_type === 'click_menu_item' ||
            e.event_type === 'click.menu_item') &&
          periodFilter(e.timestamp, period),
      );
      const allItemIds = Array.from(
        new Set(menuEvents.map((e) => e.metadata?.itemId).filter(Boolean)),
      );
      const menuItemTranslations = await MenuItemTranslation.findAll({
        where: { menuItemId: allItemIds, language: 'hr' },
        attributes: ['menuItemId', 'name'],
        raw: true,
      });
      const drinkItemTranslations = await DrinkItemTranslation.findAll({
        where: { drinkItemId: allItemIds, language: 'hr' },
        attributes: ['drinkItemId', 'name'],
        raw: true,
      });
      const idToName = {};
      menuItemTranslations.forEach((t) => (idToName[t.menuItemId] = t.name));
      drinkItemTranslations.forEach((t) => (idToName[t.drinkItemId] = t.name));

      // Računamo total i unique za sve iteme
      const itemStats = {};
      for (const e of menuEvents) {
        const id = e.metadata?.itemId;
        if (!id) continue;

        if (!itemStats[id]) {
          itemStats[id] = { total: 0, unique: new Set() };
        }

        itemStats[id].total += 1;
        if (e.session_id) {
          itemStats[id].unique.add(e.session_id);
        }
      }

      // Sortiramo po total count i uzimamo top 6
      const sortedItems = Object.entries(itemStats)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 6);

      if (!topMenuItems[period]) {
        topMenuItems[period] = { total: [], unique: [] };
      }

      // Dodajemo iste iteme u oba niza, ali s različitim count-ovima
      for (const [id, stats] of sortedItems) {
        const name = idToName[id] || id;
        topMenuItems[period].total.push({ name, count: stats.total });
        topMenuItems[period].unique.push({ name, count: stats.unique.size });
      }
    }
    // --- TREND (postotna promjena za views/clicks) ---
    function getPeriodRange(period) {
      const now = new Date();
      let start, end, prevStart, prevEnd;
      if (period === 'today') {
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        prevStart = new Date(start);
        prevStart.setDate(start.getDate() - 1);
        prevEnd = new Date(end);
        prevEnd.setDate(end.getDate() - 1);
      } else if (period === 'last7') {
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        start = new Date(now);
        start.setDate(now.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        prevEnd = new Date(start);
        prevEnd.setDate(start.getDate() - 1);
        prevStart = new Date(prevEnd);
        prevStart.setDate(prevEnd.getDate() - 6);
      } else if (period === 'last30') {
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        start = new Date(now);
        start.setDate(now.getDate() - 29);
        start.setHours(0, 0, 0, 0);
        prevEnd = new Date(start);
        prevEnd.setDate(start.getDate() - 1);
        prevStart = new Date(prevEnd);
        prevStart.setDate(prevEnd.getDate() - 29);
      } else {
        return null;
      }
      return { start, end, prevStart, prevEnd };
    }
    summary.trend = { views: {}, clicks: {} };
    for (const metric of ['views', 'clicks']) {
      for (const period of PERIODS) {
        if (period === 'all_time') {
          summary.trend[metric][period] = null;
          continue;
        }
        const range = getPeriodRange(period);
        if (!range) {
          summary.trend[metric][period] = null;
          continue;
        }
        const { start, end, prevStart, prevEnd } = range;
        const current = events.filter(
          (e) =>
            metricMap[metric].includes(e.event_type) &&
            new Date(e.timestamp) >= start &&
            new Date(e.timestamp) <= end,
        ).length;
        const previous = events.filter(
          (e) =>
            metricMap[metric].includes(e.event_type) &&
            new Date(e.timestamp) >= prevStart &&
            new Date(e.timestamp) <= prevEnd,
        ).length;
        summary.trend[metric][period] = getChangePercentage(current, previous);
      }
    }
    // --- DINVER ANALYTICS (samo za all_restaurants scope) ---
    let dinverStats = null;
    let dinverStatsChange = null;
    if (scope === 'all_restaurants') {
      dinverStats = {};
      dinverStatsChange = {};

      // 1. Claimed restaurants (po periodu)
      for (const period of PERIODS) {
        dinverStats.claimedRestaurants = dinverStats.claimedRestaurants || {};

        if (period === 'all_time') {
          // Za all_time, samo brojimo sve claimane restorane
          const claimedCount = await Restaurant.count({
            where: { isClaimed: true },
          });
          dinverStats.claimedRestaurants[period] = claimedCount;
        } else {
          // Za ostale periode, dohvaćamo ClaimLog podatke i filtriramo
          const startDate =
            period === 'today'
              ? new Date(new Date().setHours(0, 0, 0, 0))
              : period === 'last7'
                ? new Date(new Date().setDate(new Date().getDate() - 6))
                : new Date(new Date().setDate(new Date().getDate() - 29));

          const claimLogs = await ClaimLog.findAll({
            where: {
              createdAt: { [Op.gte]: startDate },
            },
            attributes: ['restaurantId'],
            raw: true,
          });

          // Brojimo unique restaurantId-eve iz ClaimLog-a
          const uniqueRestaurantIds = new Set(
            claimLogs.map((log) => log.restaurantId),
          );
          dinverStats.claimedRestaurants[period] = uniqueRestaurantIds.size;
        }
      }

      // 2. Registered users (po periodu)
      for (const period of PERIODS) {
        dinverStats.users = dinverStats.users || {};
        const users = await User.findAll({
          where:
            period !== 'all_time'
              ? {
                  createdAt: {
                    [Op.gte]:
                      period === 'today'
                        ? new Date(new Date().setHours(0, 0, 0, 0))
                        : period === 'last7'
                          ? new Date(
                              new Date().setDate(new Date().getDate() - 6),
                            )
                          : new Date(
                              new Date().setDate(new Date().getDate() - 29),
                            ),
                  },
                }
              : {},
          raw: true,
        });
        dinverStats.users[period] = users.length;
      }

      // 3. Completed reservations (po periodu)
      for (const period of PERIODS) {
        dinverStats.completedReservations =
          dinverStats.completedReservations || {};
        const reservations = await Reservation.findAll({
          where: {
            status: 'completed',
            ...(period !== 'all_time' && {
              createdAt: {
                [Op.gte]:
                  period === 'today'
                    ? new Date(new Date().setHours(0, 0, 0, 0))
                    : period === 'last7'
                      ? new Date(new Date().setDate(new Date().getDate() - 6))
                      : new Date(new Date().setDate(new Date().getDate() - 29)),
              },
            }),
          },
          raw: true,
        });
        dinverStats.completedReservations[period] = reservations.length;
      }

      // 4. Claimed cities (po periodu)
      for (const period of PERIODS) {
        dinverStats.claimedCities = dinverStats.claimedCities || {};

        if (period === 'all_time') {
          // Za all_time, dohvaćamo sve claimane restorane s place podacima
          const claimedRestaurants = await Restaurant.findAll({
            where: {
              isClaimed: true,
              place: { [Op.ne]: null },
            },
            attributes: ['place'],
            raw: true,
          });

          const uniqueCities = new Set(
            claimedRestaurants.map((r) => r.place).filter(Boolean),
          );
          dinverStats.claimedCities[period] = uniqueCities.size;
        } else {
          // Za ostale periode, dohvaćamo ClaimLog podatke i filtriramo
          const startDate =
            period === 'today'
              ? new Date(new Date().setHours(0, 0, 0, 0))
              : period === 'last7'
                ? new Date(new Date().setDate(new Date().getDate() - 6))
                : new Date(new Date().setDate(new Date().getDate() - 29));

          const claimLogs = await ClaimLog.findAll({
            where: {
              createdAt: { [Op.gte]: startDate },
            },
            attributes: ['restaurantId'],
            raw: true,
          });

          // Dohvaćamo place podatke za restorane iz ClaimLog-a
          const restaurantIds = [
            ...new Set(claimLogs.map((log) => log.restaurantId)),
          ];

          if (restaurantIds.length > 0) {
            const restaurants = await Restaurant.findAll({
              where: {
                id: { [Op.in]: restaurantIds },
                place: { [Op.ne]: null },
              },
              attributes: ['place'],
              raw: true,
            });

            const uniqueCities = new Set(
              restaurants.map((r) => r.place).filter(Boolean),
            );
            dinverStats.claimedCities[period] = uniqueCities.size;
          } else {
            dinverStats.claimedCities[period] = 0;
          }
        }
      }

      // --- DINVER TREND CALCULATION ---
      // Računamo trendove za Dinver KPI-ove (samo za today, last7, last30)
      for (const metric of [
        'claimedRestaurants',
        'users',
        'completedReservations',
        'claimedCities',
      ]) {
        dinverStatsChange[metric] = {};
        for (const period of ['today', 'last7', 'last30']) {
          const range = getPeriodRange(period);
          if (!range) {
            dinverStatsChange[metric][period] = 0;
            continue;
          }

          const { start, end, prevStart, prevEnd } = range;
          let current = 0;
          let previous = 0;

          if (metric === 'claimedRestaurants') {
            // Za claimed restaurants, računamo po ClaimLog datumu
            const currentClaimLogs = await ClaimLog.findAll({
              where: {
                createdAt: {
                  [Op.gte]: start,
                  [Op.lte]: end,
                },
              },
              attributes: ['restaurantId'],
              raw: true,
            });

            const previousClaimLogs = await ClaimLog.findAll({
              where: {
                createdAt: {
                  [Op.gte]: prevStart,
                  [Op.lte]: prevEnd,
                },
              },
              attributes: ['restaurantId'],
              raw: true,
            });

            current = new Set(currentClaimLogs.map((log) => log.restaurantId))
              .size;
            previous = new Set(previousClaimLogs.map((log) => log.restaurantId))
              .size;
          } else if (metric === 'users') {
            // Za users, računamo po createdAt datumu
            current = await User.count({
              where: {
                createdAt: {
                  [Op.gte]: start,
                  [Op.lte]: end,
                },
              },
            });

            previous = await User.count({
              where: {
                createdAt: {
                  [Op.gte]: prevStart,
                  [Op.lte]: prevEnd,
                },
              },
            });
          } else if (metric === 'completedReservations') {
            // Za completed reservations, računamo po createdAt datumu
            current = await Reservation.count({
              where: {
                status: 'completed',
                createdAt: {
                  [Op.gte]: start,
                  [Op.lte]: end,
                },
              },
            });

            previous = await Reservation.count({
              where: {
                status: 'completed',
                createdAt: {
                  [Op.gte]: prevStart,
                  [Op.lte]: prevEnd,
                },
              },
            });
          } else if (metric === 'claimedCities') {
            // Za claimed cities, računamo po ClaimLog datumu
            const currentClaimLogs = await ClaimLog.findAll({
              where: {
                createdAt: {
                  [Op.gte]: start,
                  [Op.lte]: end,
                },
              },
              attributes: ['restaurantId'],
              raw: true,
            });

            const previousClaimLogs = await ClaimLog.findAll({
              where: {
                createdAt: {
                  [Op.gte]: prevStart,
                  [Op.lte]: prevEnd,
                },
              },
              attributes: ['restaurantId'],
              raw: true,
            });

            // Dohvaćamo place podatke za current period
            const currentRestaurantIds = [
              ...new Set(currentClaimLogs.map((log) => log.restaurantId)),
            ];
            let currentCities = new Set();
            if (currentRestaurantIds.length > 0) {
              const currentRestaurants = await Restaurant.findAll({
                where: {
                  id: { [Op.in]: currentRestaurantIds },
                  place: { [Op.ne]: null },
                },
                attributes: ['place'],
                raw: true,
              });
              currentCities = new Set(
                currentRestaurants.map((r) => r.place).filter(Boolean),
              );
            }

            // Dohvaćamo place podatke za previous period
            const previousRestaurantIds = [
              ...new Set(previousClaimLogs.map((log) => log.restaurantId)),
            ];
            let previousCities = new Set();
            if (previousRestaurantIds.length > 0) {
              const previousRestaurants = await Restaurant.findAll({
                where: {
                  id: { [Op.in]: previousRestaurantIds },
                  place: { [Op.ne]: null },
                },
                attributes: ['place'],
                raw: true,
              });
              previousCities = new Set(
                previousRestaurants.map((r) => r.place).filter(Boolean),
              );
            }

            current = currentCities.size;
            previous = previousCities.size;
          }

          dinverStatsChange[metric][period] = getChangePercentage(
            current,
            previous,
          );
        }
        // Za all_time ne računamo trend
        dinverStatsChange[metric]['all_time'] = 0;
      }
    }

    // --- RESPONSE ---
    res.json({
      summary,
      sourceDistribution,
      hourlyActivity,
      dailyActivity,
      events: eventsSummary,
      topMenuItems,
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

const getPopularRestaurants = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ error: 'latitude and longitude are required' });
    }
    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);
    const limit = 20;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Dohvati samo restaurant_view događaje s userId (prijavljeni korisnici)
    const clicks = await AnalyticsEvent.findAll({
      attributes: [
        'restaurant_id',
        [
          Sequelize.fn(
            'COUNT',
            Sequelize.fn('DISTINCT', Sequelize.col('session_id')),
          ),
          'userCount',
        ],
      ],
      where: {
        event_type: 'restaurant_view',
        session_id: { [Op.ne]: null },
        timestamp: { [Op.gte]: weekAgo },
        // Samo događaji od prijavljenih korisnika (session_id je UUID, ne guest session)
        // session_id: {
        //   [Op.regexp]:
        //     '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
        // },
      },
      group: ['restaurant_id'],
      order: [
        [
          Sequelize.fn(
            'COUNT',
            Sequelize.fn('DISTINCT', Sequelize.col('session_id')),
          ),
          'DESC',
        ],
      ],
    });

    const restaurantIds = clicks.map((c) => c.restaurant_id);
    const restaurants = await Restaurant.findAll({
      where: { id: restaurantIds },
    });

    const withDistance = clicks
      .map((c) => {
        const r = restaurants.find((rest) => rest.id === c.restaurant_id);
        let distance = null;
        if (r && r.latitude && r.longitude) {
          distance = calculateDistance(
            userLat,
            userLon,
            parseFloat(r.latitude),
            parseFloat(r.longitude),
          );
        }
        return {
          restaurant: r
            ? {
                id: r.id,
                name: r.name,
                description: r.description,
                address: r.address,
                place: r.place,
                latitude: r.latitude,
                longitude: r.longitude,
                phone: r.phone,
                rating: r.rating,
                priceLevel: r.priceLevel,
                thumbnailUrl: r.thumbnailUrl,
                distance,
              }
            : null,
          userCount: parseInt(c.get('userCount'), 10),
          distance,
        };
      })
      .filter((item) => item.restaurant && item.distance !== null);

    function getWithinRadius(radius) {
      return withDistance
        .filter((r) => r.distance <= radius)
        .sort((a, b) => b.userCount - a.userCount)
        .slice(0, limit);
    }

    let popular = getWithinRadius(10);
    if (popular.length < limit) {
      const extra = getWithinRadius(25).filter(
        (r) => !popular.some((p) => p.restaurant.id === r.restaurant.id),
      );
      popular = [...popular, ...extra].slice(0, limit);
    }
    if (popular.length < limit) {
      const extra = getWithinRadius(50).filter(
        (r) => !popular.some((p) => p.restaurant.id === r.restaurant.id),
      );
      popular = [...popular, ...extra].slice(0, limit);
    }

    res.json({ latitude: userLat, longitude: userLon, popular });
  } catch (error) {
    console.error('Error fetching popular restaurants:', error);
    res.status(500).json({ error: 'Failed to fetch popular restaurants' });
  }
};

module.exports = {
  logAnalyticsEvent,
  getAnalyticsSummary,
  getPopularRestaurants,
};
