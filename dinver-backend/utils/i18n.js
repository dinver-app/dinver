const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const path = require('path');

// Inicijaliziraj i18next za backend
i18next.use(Backend).init({
  lng: 'en', // Defaultni jezik
  fallbackLng: 'en', // Ako jezik nije pronađen, koristi engleski
  supportedLngs: ['en', 'hr'],
  preload: ['en', 'hr'], // Preload oba jezika
  ns: ['translations'], // Namespace
  defaultNS: 'translations',
  backend: {
    loadPath: path.join(__dirname, '../locales/{{lng}}.json'),
  },
  interpolation: {
    escapeValue: false, // Ne escapuj HTML jer ne koristimo HTML u notifikacijama
  },
  initImmediate: false, // Initialize synchronously
});

/**
 * Dohvati i18next instancu za dati jezik
 * @param {string} language - Jezik ('en', 'hr')
 * @returns {Object} i18next instance
 */
const getI18nForLanguage = (language = 'en') => {
  return i18next.getFixedT(language);
};

module.exports = { i18next, getI18nForLanguage };
