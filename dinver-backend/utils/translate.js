const { Translate } = require('@google-cloud/translate').v2;

const translate = new Translate({
  projectId: process.env.GOOGLE_PROJECT_ID,
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
});

const autoTranslate = async (translations) => {
  let hrTranslation = translations.find((t) => t.language === 'hr');
  let enTranslation = translations.find((t) => t.language === 'en');

  // Inicijaliziraj objekte ako ne postoje
  if (!hrTranslation) {
    hrTranslation = { language: 'hr', name: '', description: '' };
    translations.push(hrTranslation);
  }
  if (!enTranslation) {
    enTranslation = { language: 'en', name: '', description: '' };
    translations.push(enTranslation);
  }

  // Provjeri i prevedi opise
  if (
    hrTranslation.description !== undefined &&
    hrTranslation.description !== '' &&
    enTranslation.description === ''
  ) {
    const [descriptionTranslation] = await translate.translate(
      hrTranslation.description,
      {
        from: 'hr',
        to: 'en',
      },
    );
    enTranslation.description = descriptionTranslation;
  } else if (
    enTranslation.description !== undefined &&
    enTranslation.description !== '' &&
    hrTranslation.description === ''
  ) {
    const [descriptionTranslation] = await translate.translate(
      enTranslation.description,
      {
        from: 'en',
        to: 'hr',
      },
    );
    hrTranslation.description = descriptionTranslation;
  }

  // Provjeri i prevedi imena
  if (
    hrTranslation.name !== undefined &&
    hrTranslation.name !== '' &&
    enTranslation.name === ''
  ) {
    const [nameTranslation] = await translate.translate(hrTranslation.name, {
      from: 'hr',
      to: 'en',
    });
    enTranslation.name = nameTranslation;
  } else if (
    enTranslation.name !== undefined &&
    enTranslation.name !== '' &&
    hrTranslation.name === ''
  ) {
    const [nameTranslation] = await translate.translate(enTranslation.name, {
      from: 'en',
      to: 'hr',
    });
    hrTranslation.name = nameTranslation;
  }

  return translations;
};

// Simple in-memory cache for translating short labels like sizes
const sizeNameCache = new Map();

/**
 * Translate a short label (e.g., size name) to both HR and EN.
 * Uses auto-detect for source language and caches results in-memory.
 * @param {string} name
 * @returns {Promise<{hr: string, en: string}>}
 */
const translateSizeNameBoth = async (name) => {
  const key = (name || '').trim().toLowerCase();
  if (sizeNameCache.has(key)) return sizeNameCache.get(key);

  // Auto-detect source, get both translations
  const [[enTranslation], [hrTranslation]] = await Promise.all([
    translate.translate(name, { to: 'en' }),
    translate.translate(name, { to: 'hr' }),
  ]);

  const result = {
    en: enTranslation,
    hr: hrTranslation,
  };
  sizeNameCache.set(key, result);
  return result;
};

module.exports = {
  autoTranslate,
  translateSizeNameBoth,
};
