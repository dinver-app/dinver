'use strict';

function replyOutOfScope(lang) {
  return lang === 'hr'
    ? 'Mogu odgovarati samo na pitanja vezana uz Dinver i restorane.'
    : 'I can only help with questions about Dinver restaurants and menus.';
}

function replyNoData(lang) {
  return lang === 'hr'
    ? 'Trenutno nemam taj podatak.'
    : 'I do not have that information right now.';
}

function shortJoin(names) {
  return names.slice(0, 3).join(', ') + (names.length > 3 ? '…' : '');
}

const dayNames = {
  hr: [
    'ponedjeljak',
    'utorak',
    'srijeda',
    'četvrtak',
    'petak',
    'subota',
    'nedjelja',
  ],
  en: [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ],
};

function formatTimeHHmm(hhmm) {
  if (!hhmm || hhmm.length < 3) return '';
  const h = hhmm.slice(0, 2);
  const m = hhmm.slice(2, 4) || '00';
  return `${h}:${m}`;
}

function formatHoursResponse(lang, restaurantName, dayIndex, open, close) {
  const dayLabel = dayNames[lang][dayIndex];
  if (!open || !close) {
    return lang === 'hr'
      ? `${restaurantName} je ${dayLabel} zatvoren.`
      : `${restaurantName} is closed on ${dayLabel}.`;
  }
  const o = formatTimeHHmm(open.time);
  const c = formatTimeHHmm(close.time);
  return lang === 'hr'
    ? `${restaurantName} radi ${dayLabel} od ${o} do ${c}.`
    : `${restaurantName} is open on ${dayLabel} from ${o} to ${c}.`;
}

function formatNearbyResponse(lang, results) {
  if (!results || results.length === 0) {
    return lang === 'hr'
      ? 'Nema partner restorana u blizini.'
      : 'No partner restaurants nearby.';
  }
  const names = results
    .slice(0, 3)
    .map((r) => `${r.name} (${r.distanceKm} km)`);
  return lang === 'hr'
    ? `Blizu su: ${names.join(', ')}.`
    : `Nearby: ${names.join(', ')}.`;
}

module.exports = {
  replyOutOfScope,
  replyNoData,
  formatHoursResponse,
  formatNearbyResponse,
  shortJoin,
};
