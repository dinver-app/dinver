'use strict';

const {
  fetchRestaurantDetails,
  fetchTypesForRestaurant,
  fetchAllMenuItemsForRestaurant,
} = require('./dataAccess');

/**
 * Get current time in Zagreb timezone (Europe/Zagreb)
 * Properly handles daylight saving time
 */
function getZagrebNow() {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Europe/Zagreb' }),
  );
}

/**
 * Convert JS day (0=Sunday) to Mon0 format (0=Monday)
 */
function jsDayToMon0(jsDay) {
  return jsDay === 0 ? 6 : jsDay - 1;
}

/**
 * Parse time string "1030" to minutes since midnight
 */
function parseMinutes(hhmm) {
  if (!hhmm || hhmm.length < 2) return null;
  const h = Number(hhmm.slice(0, 2));
  const m = Number(hhmm.slice(2, 4) || '0');
  return h * 60 + m;
}

/**
 * Get today's period from openingHours, considering customWorkingDays overrides
 */
function getTodayPeriod(openingHours, customWorkingDays) {
  const now = getZagrebNow();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const key = `${y}-${m}-${d}`;

  // Check for custom working day override
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

  // Use regular openingHours
  const jsDay = now.getDay();
  const mon0 = jsDayToMon0(jsDay);
  const p = openingHours?.periods?.[mon0];
  return p || null;
}

/**
 * Compute if restaurant is currently open based on Zagreb time
 */
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

    // Spans midnight
    if (minutes >= o) return true;
    if (minutes < c) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Format time "1030" to "10:30"
 */
function formatTime(time) {
  if (!time || time.length < 4) return '';
  return `${time.slice(0, 2)}:${time.slice(2, 4)}`;
}

/**
 * Compress schedule to human-readable format
 * Example: "Pon-Pet: 10:00-22:00, Sub: 10:00-23:00, Ned: Zatvoreno"
 */
function compressSchedule(schedule, lang) {
  if (!schedule || schedule.length === 0) return '';

  const groups = [];
  let currentGroup = {
    days: [schedule[0].day],
    hours: schedule[0].hours || schedule[0].status,
  };

  for (let i = 1; i < schedule.length; i++) {
    const current = schedule[i];
    const hoursMatch =
      (current.hours || current.status) === currentGroup.hours;

    if (hoursMatch) {
      currentGroup.days.push(current.day);
    } else {
      groups.push(currentGroup);
      currentGroup = {
        days: [current.day],
        hours: current.hours || current.status,
      };
    }
  }
  groups.push(currentGroup);

  return groups
    .map((g) => {
      const dayRange =
        g.days.length > 1
          ? `${g.days[0]}-${g.days[g.days.length - 1]}`
          : g.days[0];
      return `${dayRange}: ${g.hours}`;
    })
    .join(', ');
}

/**
 * Format opening hours for AI in a human-readable way
 * Returns formatted schedule, today's status, and raw data
 */
function formatOpeningHoursForAI(openingHours, customWorkingDays, lang = 'hr') {
  if (!openingHours?.periods) return null;

  const dayNames = {
    hr: ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'],
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  };

  const days = dayNames[lang];
  const schedule = [];

  // Build schedule for each day (starting with Monday for Croatian convention)
  // We'll reorder to Mon-Sun for display
  const reorderedIndices = [1, 2, 3, 4, 5, 6, 0]; // Mon, Tue, Wed, Thu, Fri, Sat, Sun
  const closedText = lang === 'hr' ? 'Zatvoreno' : 'Closed';

  for (let i = 0; i < 7; i++) {
    const mon0Index = reorderedIndices[i] === 0 ? 6 : reorderedIndices[i] - 1;
    const period = openingHours.periods[mon0Index];

    if (!period || !period.open || !period.close) {
      schedule.push({ day: days[reorderedIndices[i]], status: closedText });
    } else {
      const open = formatTime(period.open.time);
      const close = formatTime(period.close.time);

      if (open === '' || close === '') {
        schedule.push({ day: days[reorderedIndices[i]], status: closedText });
      } else {
        schedule.push({ day: days[reorderedIndices[i]], hours: `${open}-${close}` });
      }
    }
  }

  // Compress consecutive days with same hours
  const compressed = compressSchedule(schedule, lang);

  // Today's hours
  const now = getZagrebNow();
  const jsDay = now.getDay();
  const todayMon0 = jsDayToMon0(jsDay);
  const todayPeriod = openingHours.periods[todayMon0];

  let todayStatus;
  if (todayPeriod && todayPeriod.open && todayPeriod.close) {
    const openTime = formatTime(todayPeriod.open.time);
    const closeTime = formatTime(todayPeriod.close.time);

    if (openTime && closeTime) {
      const isOpen = computeOpenNow(openingHours, customWorkingDays);
      todayStatus = {
        isOpen,
        opens: openTime,
        closes: closeTime,
      };
    } else {
      todayStatus = { closed: true };
    }
  } else {
    todayStatus = { closed: true };
  }

  return {
    formatted: compressed,
    today: todayStatus,
    raw: openingHours, // Keep for debugging if needed
  };
}

/**
 * Build comprehensive restaurant data for AI with ALL available information
 * This is the MAIN function that enriches restaurant data for AI responses
 *
 * @param {string} restaurantId - Restaurant UUID
 * @param {string} lang - Language code ('hr' or 'en')
 * @returns {Promise<Object|null>} - Comprehensive restaurant data or null if not found
 */
async function buildComprehensiveRestaurantData(restaurantId, lang = 'hr') {
  if (!restaurantId) return null;

  try {
    // Fetch restaurant details
    const restaurant = await fetchRestaurantDetails(restaurantId);
    if (!restaurant) return null;

    // Fetch types and enrich with human-readable names
    const types = await fetchTypesForRestaurant(restaurant);

    // Format opening hours for AI
    const formattedHours = formatOpeningHoursForAI(
      restaurant.openingHours,
      restaurant.customWorkingDays,
      lang,
    );

    // Calculate isOpenNow
    const openNow = computeOpenNow(
      restaurant.openingHours,
      restaurant.customWorkingDays,
    );

    // Fetch sample menu items (top 10)
    const menuSample = await fetchAllMenuItemsForRestaurant(
      restaurantId,
      lang,
      10,
    );

    // Build comprehensive data object
    return {
      // ===== BASIC INFO =====
      id: restaurant.id,
      name: restaurant.name,
      // Use longDescription if available (for AI context), fallback to short description
      description: restaurant.longDescription ||
        (lang === 'hr'
          ? restaurant.description?.hr || ''
          : restaurant.description?.en || ''),
      address: restaurant.address || '',
      place: restaurant.place || '',
      country: restaurant.country || '',
      slug: restaurant.slug || '',

      // ===== RATINGS - DINVER CUSTOM =====
      // Use Dinver ratings (from Experiences) instead of Google ratings
      rating: restaurant.dinverRating != null ? Number(restaurant.dinverRating) : null,
      userRatingsTotal: restaurant.userRatingsTotal != null ? Number(restaurant.userRatingsTotal) : null,
      dinverRating: restaurant.dinverRating != null ? Number(restaurant.dinverRating) : null,
      dinverReviewsCount: restaurant.dinverReviewsCount != null ? Number(restaurant.dinverReviewsCount) : null,
      // Note: foodQuality, service, atmosphere will come from Experiences aggregation later
      foodQuality: null, // TODO: Calculate from Experiences when implemented
      service: null,
      atmosphere: null,

      // ===== OPENING HOURS - FORMATTED! =====
      openingHours: formattedHours,
      isOpenNow: openNow,

      // ===== PRICE INFO =====
      priceCategory: restaurant.priceCategory
        ? {
            level: restaurant.priceCategory.level,
            name:
              lang === 'hr'
                ? restaurant.priceCategory.nameHr
                : restaurant.priceCategory.nameEn,
            icon: restaurant.priceCategory.icon,
          }
        : null,

      // ===== TYPES & FILTERS - ENRICHED! =====
      foodTypes: (types.foodTypes || []).map((ft) => ({
        id: ft.id,
        name: lang === 'hr' ? ft.nameHr : ft.nameEn,
        icon: ft.icon || '',
      })),

      establishmentTypes: (types.establishmentTypes || []).map((et) => ({
        id: et.id,
        name: lang === 'hr' ? et.nameHr : et.nameEn,
        icon: et.icon || '',
      })),

      establishmentPerks: (types.establishmentPerks || []).map((ep) => ({
        id: ep.id,
        name: lang === 'hr' ? ep.nameHr : ep.nameEn,
        icon: ep.icon || '',
      })),

      mealTypes: (types.mealTypes || []).map((mt) => ({
        id: mt.id,
        name: lang === 'hr' ? mt.nameHr : mt.nameEn,
        icon: mt.icon || '',
      })),

      dietaryTypes: (types.dietaryTypes || []).map((dt) => ({
        id: dt.id,
        name: lang === 'hr' ? dt.nameHr : dt.nameEn,
        icon: dt.icon || '',
      })),

      // ===== CONTACT =====
      phone: restaurant.phone || '',
      email: restaurant.email || '',
      websiteUrl: restaurant.websiteUrl || '',
      fbUrl: restaurant.fbUrl || '',
      igUrl: restaurant.igUrl || '',
      ttUrl: restaurant.ttUrl || '',

      // ===== FEATURES =====
      reservationEnabled: !!restaurant.reservationEnabled,
      virtualTourUrl: restaurant.virtualTourUrl || '',
      wifiAvailable: !!(
        restaurant.wifiSsid && restaurant.showWifiCredentials
      ),
      wifiSsid:
        restaurant.showWifiCredentials && restaurant.wifiSsid
          ? restaurant.wifiSsid
          : '',

      // ===== MEDIA =====
      thumbnailUrl: restaurant.thumbnailUrl || '',
      images: restaurant.images || [],

      // ===== MENU SAMPLE - Top 5-8 items =====
      menuSample: (menuSample || []).slice(0, 8).map((item) => ({
        type: item.type,
        id: item.id,
        name:
          lang === 'hr'
            ? item.translations?.hr?.name || item.name
            : item.translations?.en?.name || item.name,
        price: item.price != null ? Number(item.price.toFixed(2)) : null,
        thumbnailUrl: item.thumbnailUrl || '',
      })),

      // ===== LOCATION =====
      latitude: restaurant.latitude ? Number(restaurant.latitude) : null,
      longitude: restaurant.longitude ? Number(restaurant.longitude) : null,
    };
  } catch (error) {
    console.error('[dataEnrichment] Error building comprehensive data:', error);
    return null;
  }
}

module.exports = {
  buildComprehensiveRestaurantData,
  formatOpeningHoursForAI,
  computeOpenNow,
  getZagrebNow,
};
