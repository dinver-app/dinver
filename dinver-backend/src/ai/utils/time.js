'use strict';

/**
 * Time helpers for Europe/Zagreb timezone
 * Handles parsing of time_ref and open/close computation
 */

const TIMEZONE = 'Europe/Zagreb';

/**
 * Parse time reference string to Date in Europe/Zagreb timezone
 * @param {string} timeRef - "now", "today 20:00", "sutra", "ponedjeljak", etc.
 * @returns {Date} Parsed date
 */
function parseTimeRef(timeRef) {
  if (!timeRef) {
    return new Date(); // now
  }

  const ref = timeRef.toLowerCase().trim();

  // "now" or "sada"
  if (ref === 'now' || ref === 'sada' || ref === 'trenutno') {
    return new Date();
  }

  // "danas" / "today"
  if (ref.startsWith('danas') || ref.startsWith('today')) {
    const timeMatch = ref.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const [_, hour, minute] = timeMatch;
      const date = new Date();
      date.setHours(parseInt(hour), parseInt(minute), 0, 0);
      return date;
    }
    return new Date();
  }

  // "sutra" / "tomorrow"
  if (ref === 'sutra' || ref === 'tomorrow') {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(12, 0, 0, 0); // default to noon
    return date;
  }

  // "preksutra" / "day after tomorrow"
  if (ref === 'preksutra' || ref === 'prekosutra') {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    date.setHours(12, 0, 0, 0);
    return date;
  }

  // "za N dana" / "in N days"
  const daysMatch = ref.match(/za\s+(\d+)\s+dan/i) || ref.match(/in\s+(\d+)\s+day/i);
  if (daysMatch) {
    const days = parseInt(daysMatch[1]);
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(12, 0, 0, 0);
    return date;
  }

  // Specific date formats: "1.2.2026", "15.3.2025", "2026-02-01"
  const dateMatch = ref.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/) || ref.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (dateMatch) {
    let day, month, year;
    if (ref.includes('.')) {
      // DD.MM.YYYY format
      [, day, month, year] = dateMatch;
    } else {
      // YYYY-MM-DD format
      [, year, month, day] = dateMatch;
    }
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0, 0);
    return date;
  }

  // Weekdays (Croatian) - all cases (nominative + instrumental)
  const weekdaysHr = {
    ponedjeljak: 1, ponedjeljkom: 1,
    utorak: 2, utorkom: 2,
    srijeda: 3, srijedom: 3,
    četvrtak: 4, četvrtkom: 4,
    petak: 5, petkom: 5,
    subota: 6, subotom: 6,
    nedjelja: 0, nedjeljom: 0,
  };

  // Weekdays (English)
  const weekdaysEn = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 0,
  };

  // Check Croatian weekdays (both nominative and instrumental)
  for (const [day, dayNum] of Object.entries(weekdaysHr)) {
    if (ref.includes(day)) {
      return getNextWeekday(dayNum);
    }
  }

  // Check English weekdays
  for (const [day, dayNum] of Object.entries(weekdaysEn)) {
    if (ref.includes(day)) {
      return getNextWeekday(dayNum);
    }
  }

  // Fallback: try to parse as time HH:MM
  const timeMatch = ref.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const [_, hour, minute] = timeMatch;
    const date = new Date();
    date.setHours(parseInt(hour), parseInt(minute), 0, 0);
    return date;
  }

  // Default to now
  return new Date();
}

/**
 * Get next occurrence of a weekday
 * @param {number} targetDay - Day of week (0=Sunday, 1=Monday, ...)
 * @returns {Date}
 */
function getNextWeekday(targetDay) {
  const date = new Date();
  const currentDay = date.getDay();
  let daysToAdd = targetDay - currentDay;

  if (daysToAdd <= 0) {
    daysToAdd += 7; // Next week
  }

  date.setDate(date.getDate() + daysToAdd);
  date.setHours(12, 0, 0, 0); // default to noon
  return date;
}

/**
 * Parse HH:MM or HHMM to minutes since midnight
 * @param {string} hhmm
 * @returns {number|null}
 */
function parseMinutes(hhmm) {
  if (!hhmm || hhmm.length < 2) return null;
  const h = Number(hhmm.slice(0, 2));
  const m = Number(hhmm.slice(2, 4) || '0');
  return h * 60 + m;
}

/**
 * Convert JS day (0=Sunday) to Monday-based (0=Monday, 6=Sunday)
 * @param {number} jsDay
 * @returns {number}
 */
function jsDayToMon0(jsDay) {
  return jsDay === 0 ? 6 : jsDay - 1;
}

/**
 * Get period from opening hours or custom working days for a specific date
 * @param {object} openingHours
 * @param {object} customWorkingDays
 * @param {Date} dateTime - Date to check (defaults to now)
 * @returns {object|null}
 */
function getTodayPeriod(openingHours, customWorkingDays, dateTime = new Date()) {
  const now = dateTime || new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const key = `${y}-${m}-${d}`;

  // Check for custom working day override
  const override = customWorkingDays && customWorkingDays[key];
  if (override && override.open && override.close) {
    const toHHmm = (s) => (s || '').replace(':', '').padEnd(4, '0').slice(0, 4);
    const jsDay = now.getDay();
    const mon0 = jsDayToMon0(jsDay);
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

  // Use standard opening hours
  const jsDay = now.getDay();
  const mon0 = jsDayToMon0(jsDay);
  const p = openingHours?.periods?.[mon0];
  return p || null;
}

/**
 * Check if restaurant is open at a specific date/time
 * @param {object} openingHours - Opening hours object (with periods array)
 * @param {object} customWorkingDays - Custom working days object (optional)
 * @param {Date} dateTime - Date to check (defaults to now)
 * @returns {object} { isOpen: boolean, nextChange: Date|null, message: string }
 */
function isOpenAt(openingHours, customWorkingDays = null, dateTime = new Date(), language = 'hr') {
  if (!openingHours || !openingHours.periods) {
    return {
      isOpen: false,
      nextChange: null,
      message: language === 'hr' ? 'Radno vrijeme nije dostupno' : 'Working hours not available',
    };
  }

  try {
    const now = dateTime;
    const minutes = now.getHours() * 60 + now.getMinutes();

    const today = getTodayPeriod(openingHours, customWorkingDays, dateTime);

    if (!today || !today.open?.time || !today.close?.time) {
      return {
        isOpen: false,
        nextChange: null,
        message: 'Closed today',
      };
    }

    const openMin = parseMinutes(today.open.time);
    const closeMin = parseMinutes(today.close.time);
    const spansMidnight = today.close.day !== today.open.day;

    if (openMin == null || closeMin == null) {
      return {
        isOpen: false,
        nextChange: null,
        message: 'Invalid working hours format',
      };
    }

    let isOpen = false;

    if (!spansMidnight) {
      // Normal hours (e.g., 08:00-22:00)
      isOpen = minutes >= openMin && minutes < closeMin;
    } else {
      // Spans midnight (e.g., 20:00-02:00)
      isOpen = minutes >= openMin || minutes < closeMin;
    }

    // Calculate next change (open→close or close→open)
    let nextChange = null;
    if (isOpen) {
      // Currently open, next change is closing time
      const closeHour = Math.floor(closeMin / 60);
      const closeMinute = closeMin % 60;
      nextChange = new Date(now);
      nextChange.setHours(closeHour, closeMinute, 0, 0);

      if (spansMidnight && minutes >= openMin) {
        // Closes tomorrow
        nextChange.setDate(nextChange.getDate() + 1);
      }
    } else {
      // Currently closed, next change is opening time
      const openHour = Math.floor(openMin / 60);
      const openMinute = openMin % 60;
      nextChange = new Date(now);
      nextChange.setHours(openHour, openMinute, 0, 0);

      if (minutes >= closeMin && !spansMidnight) {
        // Opens tomorrow
        nextChange.setDate(nextChange.getDate() + 1);
      }
    }

    // Format day info if not today
    const isToday = now.toDateString() === new Date().toDateString();
    const dayInfo = isToday ? '' : ` (${formatDate(now, language)})`;

    // Calculate opening and closing times for display
    const openHour = Math.floor(openMin / 60);
    const openMinute = openMin % 60;
    const closeHour = Math.floor(closeMin / 60);
    const closeMinute = closeMin % 60;

    const openTime = new Date(now);
    openTime.setHours(openHour, openMinute, 0, 0);

    const closeTime = new Date(now);
    closeTime.setHours(closeHour, closeMinute, 0, 0);
    if (spansMidnight && minutes >= openMin) {
      closeTime.setDate(closeTime.getDate() + 1);
    }

    return {
      isOpen,
      nextChange,
      openTime,
      closeTime,
      message: isOpen
        ? (language === 'hr'
          ? `Otvoreno${dayInfo}, zatvara se u ${formatTime(nextChange)}`
          : `Open${dayInfo}, closes at ${formatTime(nextChange)}`)
        : (language === 'hr'
          ? `Zatvoreno${dayInfo}, otvara se u ${formatTime(nextChange)}`
          : `Closed${dayInfo}, opens at ${formatTime(nextChange)}`),
    };
  } catch (error) {
    console.error('isOpenAt error:', error);
    return {
      isOpen: false,
      nextChange: null,
      openTime: null,
      closeTime: null,
      message: 'Error checking working hours',
    };
  }
}

/**
 * Format time in Europe/Zagreb timezone
 * @param {Date} date
 * @returns {string} Formatted time (HH:MM)
 */
function formatTime(date) {
  return date.toLocaleTimeString('hr-HR', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format date with day name
 * @param {Date} date
 * @param {string} language - hr/en
 * @returns {string} Formatted date (e.g., "ponedjeljak, 6.10.2025")
 */
function formatDate(date, language = 'hr') {
  const weekdayNames = {
    hr: ['nedjelja', 'ponedjeljak', 'utorak', 'srijeda', 'četvrtak', 'petak', 'subota'],
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  };

  const dayName = weekdayNames[language][date.getDay()];
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  return language === 'hr'
    ? `${dayName}, ${day}.${month}.${year}`
    : `${dayName}, ${month}/${day}/${year}`;
}

/**
 * Format date in Europe/Zagreb timezone
 * @param {Date} date
 * @returns {string} Formatted date (DD.MM.YYYY)
 */
function formatDate(date) {
  return date.toLocaleDateString('hr-HR', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Get current date/time in Europe/Zagreb
 * @returns {Date}
 */
function nowInZagreb() {
  // JavaScript Date automatically uses system timezone
  // But we can provide helpers for formatting
  return new Date();
}

module.exports = {
  TIMEZONE,
  parseTimeRef,
  getNextWeekday,
  isOpenAt,
  getTodayPeriod,
  parseMinutes,
  jsDayToMon0,
  formatTime,
  formatDate,
  nowInZagreb,
};
