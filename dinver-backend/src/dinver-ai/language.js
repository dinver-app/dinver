'use strict';

/**
 * Lightweight language detection for Croatian (hr) vs English (en).
 * Prefers explicit input, falls back to heuristic based on characters and keywords.
 * @param {string} text
 * @param {string|undefined} preferred
 * @returns {('hr'|'en')}
 */
function detectLanguage(text, preferred) {
  if (preferred === 'hr' || preferred === 'en') return preferred;
  if (!text) return 'en';
  const sample = text.toLowerCase();
  const croatianChars = /[čćđšž]/i;
  const croatianKeywords = [
    'jel',
    'ima li',
    'radi li',
    'radno vrijeme',
    'nedjelj',
    'ponedjelj',
    'blizu mene',
    'rezervacij',
    'cijena',
    'opis',
    'terasa',
  ];
  if (
    croatianChars.test(sample) ||
    croatianKeywords.some((k) => sample.includes(k))
  ) {
    return 'hr';
  }
  return 'en';
}

module.exports = { detectLanguage };
