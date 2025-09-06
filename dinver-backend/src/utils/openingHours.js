function getCurrentTimeParts(atISO, timeZone = 'Europe/Zagreb') {
  const date = atISO ? new Date(atISO) : new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const [hour, minute] = formatter.format(date).split(':');
  const weekdayShort = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(date);
  const weekdayToIndex = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  return {
    day: weekdayToIndex[weekdayShort],
    time: parseInt(hour, 10) * 100 + parseInt(minute, 10),
  };
}

function normalizePeriods(openingHours) {
  if (!openingHours || !openingHours.periods) return [];
  const out = [];
  for (const period of openingHours.periods) {
    const shifts = [
      { open: period.open, close: period.close },
      ...(period.shifts || []),
    ];
    for (const s of shifts) out.push({ open: s.open, close: s.close });
  }
  return out;
}

function isOpenAt(openingHours, atISO, timeZone = 'Europe/Zagreb') {
  const periods = normalizePeriods(openingHours);
  if (periods.length === 0)
    return { state: 'undefined', isOpen: null, opensAt: null, closesAt: null };
  const allEmpty = periods.every(
    (p) => (p.open?.time || '') === '' && (p.close?.time || '') === '',
  );
  if (allEmpty)
    return { state: 'undefined', isOpen: null, opensAt: null, closesAt: null };

  const { day, time } = getCurrentTimeParts(atISO, timeZone);

  for (const { open, close } of periods) {
    const openDay = open?.day;
    const closeDay = close?.day;
    const openTime = parseInt(open?.time || '0', 10);
    const closeTime = parseInt(close?.time || '0', 10);

    if (openDay === closeDay) {
      if (day === openDay && time >= openTime && time < closeTime) {
        return {
          state: 'open',
          isOpen: true,
          opensAt: null,
          closesAt: close?.time || null,
        };
      }
    } else {
      if (
        (day === openDay && time >= openTime) ||
        (day === closeDay && time < closeTime) ||
        (day > openDay && day < closeDay) ||
        (openDay > closeDay && (day > openDay || day < closeDay))
      ) {
        return {
          state: 'open',
          isOpen: true,
          opensAt: null,
          closesAt: close?.time || null,
        };
      }
    }
  }

  // If closed now, try to find next opening today
  let nextOpen = null;
  let nextClose = null;
  for (const { open, close } of periods) {
    const openDay = open?.day;
    const openTime = parseInt(open?.time || '0', 10);
    if (openDay === day && openTime > time) {
      if (nextOpen == null || openTime < nextOpen) {
        nextOpen = openTime;
        nextClose = close?.time || null;
      }
    }
  }
  return {
    state: 'closed',
    isOpen: false,
    opensAt: nextOpen != null ? String(nextOpen).padStart(4, '0') : null,
    closesAt: nextClose,
  };
}

module.exports = { isOpenAt };
