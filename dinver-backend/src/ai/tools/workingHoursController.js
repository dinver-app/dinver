const { Restaurant, PriceCategory } = require('../../../models');

function getZagrebNow() {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Europe/Zagreb' }),
  );
}

function jsDayToMon0(jsDay) {
  return jsDay === 0 ? 6 : jsDay - 1;
}

function parseMinutes(hhmm) {
  if (!hhmm || hhmm.length < 2) return null;
  const h = Number(hhmm.slice(0, 2));
  const m = Number(hhmm.slice(2, 4) || '0');
  return h * 60 + m;
}

function getTodayPeriod(openingHours, customWorkingDays) {
  const now = getZagrebNow();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const key = `${y}-${m}-${d}`;

  const override = customWorkingDays && customWorkingDays[key];
  if (override && override.open && override.close) {
    const toHHmm = (s) => (s || '').replace(':', '').padEnd(4, '0').slice(0, 4);
    const jsDay = now.getDay();
    const mon0 = jsDay === 0 ? 6 : jsDay - 1;
    const nextDay = (mon0 + 1) % 7;
    const spansMidnight = override.closeDayOffset === 1;
    return {
      open: { day: mon0, time: toHHmm(override.open) },
      close: {
        day: spansMidnight ? nextDay : mon0,
        time: toHHmm(override.close),
      },
    };
  }

  const jsDay = now.getDay();
  const mon0 = jsDay === 0 ? 6 : jsDay - 1;
  const p = openingHours?.periods?.[mon0];
  return p || null;
}

function computeOpenNow(openingHours, customWorkingDays) {
  try {
    const now = getZagrebNow();
    const minutes = now.getHours() * 60 + now.getMinutes();

    const today = getTodayPeriod(openingHours, customWorkingDays);
    if (!today?.open?.time || !today?.close?.time) return false;

    const o = parseMinutes(today.open.time);
    const c = parseMinutes(today.close.time);
    const spansMidnight = today.close.day !== today.open.day;

    if (o == null || c == null) return false;
    if (!spansMidnight) return minutes >= o && minutes < c;

    if (minutes >= o) return true;
    if (minutes < c) return true;
    return false;
  } catch {
    return false;
  }
}

function pickDayIndexFromText(text, lang) {
  const t = (text || '').toLowerCase();

  const dayPatterns = {
    hr: {
      0: ['ponedjeljak', 'ponedjelja'],
      1: ['utorak', 'utorka'],
      2: ['srijeda', 'srijede'],
      3: ['četvrtak', 'četvrtka'],
      4: ['petak', 'petka'],
      5: ['subota', 'subote'],
      6: ['nedjelja', 'nedjelje'],
    },
    en: {
      0: ['monday', 'mon'],
      1: ['tuesday', 'tue'],
      2: ['wednesday', 'wed'],
      3: ['thursday', 'thu'],
      4: ['friday', 'fri'],
      5: ['saturday', 'sat'],
      6: ['sunday', 'sun'],
    },
  };

  const patterns = dayPatterns[lang] || dayPatterns.en;

  for (const [dayIndex, words] of Object.entries(patterns)) {
    for (const word of words) {
      if (t.includes(word)) {
        return Number(dayIndex);
      }
    }
  }

  // Default to today
  const jsDay = getZagrebNow().getDay();
  return jsDayToMon0(jsDay);
}

function formatTime(timeString) {
  if (!timeString || timeString === '') return null;
  if (timeString.length === 4) {
    return `${timeString.slice(0, 2)}:${timeString.slice(2, 4)}`;
  }
  return timeString;
}

function getWeeklyHours(openingHours) {
  const days = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];
  const weeklySchedule = [];

  for (let i = 0; i < 7; i++) {
    const period = openingHours?.periods?.[i];

    if (!period || !period.open || !period.close) {
      weeklySchedule.push({
        day: days[i],
        dayIndex: i,
        open: null,
        close: null,
        isClosed: true,
      });
      continue;
    }

    const isClosed = period.open.time === '' || period.close.time === '';

    weeklySchedule.push({
      day: days[i],
      dayIndex: i,
      open: isClosed ? null : formatTime(period.open.time),
      close: isClosed ? null : formatTime(period.close.time),
      isClosed,
    });
  }

  return weeklySchedule;
}

async function getRestaurantWorkingHours(req, res) {
  try {
    const { restaurantId } = req.params;
    const { day } = req.query;

    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId is required' });
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(restaurantId)) {
      return res
        .status(400)
        .json({ error: 'restaurantId must be a valid UUID' });
    }

    // Fetch restaurant with minimal data needed for working hours
    const restaurant = await Restaurant.findOne({
      where: { id: restaurantId, isClaimed: true },
      attributes: ['id', 'name', 'openingHours', 'customWorkingDays'],
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    if (!restaurant.openingHours || !restaurant.openingHours.periods) {
      return res.json({
        restaurantId,
        restaurantName: restaurant.name,
        openingHours: null,
        weeklySchedule: null,
        openNow: false,
        message: 'Working hours not available',
      });
    }

    const openNow = computeOpenNow(
      restaurant.openingHours,
      restaurant.customWorkingDays,
    );
    const weeklySchedule = getWeeklyHours(restaurant.openingHours);

    // If specific day is requested
    if (day !== undefined) {
      const dayIndex = isNaN(day)
        ? pickDayIndexFromText(day, 'en')
        : Number(day);
      const daySchedule = weeklySchedule[dayIndex];

      if (!daySchedule) {
        return res.status(400).json({ error: 'Invalid day parameter' });
      }

      return res.json({
        restaurantId,
        restaurantName: restaurant.name,
        requestedDay: daySchedule,
        openNow,
        todayPeriod: getTodayPeriod(
          restaurant.openingHours,
          restaurant.customWorkingDays,
        ),
      });
    }

    res.json({
      restaurantId,
      restaurantName: restaurant.name,
      weeklySchedule,
      openNow,
      todayPeriod: getTodayPeriod(
        restaurant.openingHours,
        restaurant.customWorkingDays,
      ),
    });
  } catch (error) {
    console.error('getRestaurantWorkingHours error:', error);
    res.status(500).json({ error: 'Failed to get restaurant working hours' });
  }
}

async function checkRestaurantStatus(req, res) {
  try {
    const { restaurantId } = req.params;

    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId is required' });
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(restaurantId)) {
      return res
        .status(400)
        .json({ error: 'restaurantId must be a valid UUID' });
    }

    // Minimal fetch - only what's needed for status check
    const restaurant = await Restaurant.findOne({
      where: { id: restaurantId, isClaimed: true },
      attributes: ['id', 'name', 'openingHours', 'customWorkingDays'],
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const openNow = computeOpenNow(
      restaurant.openingHours,
      restaurant.customWorkingDays,
    );
    const todayPeriod = getTodayPeriod(
      restaurant.openingHours,
      restaurant.customWorkingDays,
    );

    res.json({
      restaurantId,
      restaurantName: restaurant.name,
      openNow,
      todayPeriod,
      currentTime: getZagrebNow().toISOString(),
    });
  } catch (error) {
    console.error('checkRestaurantStatus error:', error);
    res.status(500).json({ error: 'Failed to check restaurant status' });
  }
}

// Enhanced endpoint that includes working hours in restaurant details
async function getRestaurantWithHours(req, res) {
  try {
    const { restaurantId } = req.params;

    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId is required' });
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(restaurantId)) {
      return res
        .status(400)
        .json({ error: 'restaurantId must be a valid UUID' });
    }

    // Get restaurant with working hours data
    const restaurant = await Restaurant.findOne({
      where: { id: restaurantId, isClaimed: true },
      include: [
        {
          model: PriceCategory,
          as: 'priceCategory',
          attributes: ['id', 'nameEn', 'nameHr', 'icon', 'level'],
        },
      ],
      attributes: [
        'id',
        'name',
        'slug',
        'description',
        'address',
        'place',
        'openingHours',
        'customWorkingDays',
        'thumbnailUrl',
        'latitude',
        'longitude',
        'phone',
        'website',
        'facebookUrl',
        'instagramUrl',
      ],
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const openNow = computeOpenNow(
      restaurant.openingHours,
      restaurant.customWorkingDays,
    );
    const weeklySchedule = getWeeklyHours(restaurant.openingHours);
    const todayPeriod = getTodayPeriod(
      restaurant.openingHours,
      restaurant.customWorkingDays,
    );

    // Format response with working hours included
    const response = {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      description: restaurant.description,
      address: restaurant.address,
      place: restaurant.place,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      phone: restaurant.phone,
      website: restaurant.website,
      facebookUrl: restaurant.facebookUrl,
      instagramUrl: restaurant.instagramUrl,
      thumbnailUrl: restaurant.thumbnailUrl,
      priceCategory: restaurant.priceCategory,
      workingHours: {
        weeklySchedule,
        openNow,
        todayPeriod,
        currentTime: getZagrebNow().toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error('getRestaurantWithHours error:', error);
    res
      .status(500)
      .json({ error: 'Failed to get restaurant details with hours' });
  }
}

module.exports = {
  getRestaurantWorkingHours,
  checkRestaurantStatus,
  getRestaurantWithHours,
  computeOpenNow,
  getTodayPeriod,
  getWeeklyHours,
  pickDayIndexFromText,
  formatTime,
};
