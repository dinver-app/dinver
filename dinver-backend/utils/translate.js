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

/**
 * Fill missing size translations. If HR is provided, translate to EN (from: 'hr').
 * If EN is provided, translate to HR (from: 'en'). Keeps provided value intact.
 * @param {{hr?: string, en?: string}} input
 * @returns {Promise<{hr: string, en: string}>}
 */
const translateSizeNameFill = async (input = {}) => {
  const rawHr = (input.hr || '').trim();
  const rawEn = (input.en || '').trim();
  const cacheKey = `fill|hr=${rawHr.toLowerCase()}|en=${rawEn.toLowerCase()}`;
  if (sizeNameCache.has(cacheKey)) return sizeNameCache.get(cacheKey);

  // If both present, return as is
  if (rawHr && rawEn) {
    const res = { hr: rawHr, en: rawEn };
    sizeNameCache.set(cacheKey, res);
    return res;
  }

  // If only HR provided → translate HR→EN
  if (rawHr && !rawEn) {
    try {
      const [enTranslation] = await translate.translate(rawHr, {
        from: 'hr',
        to: 'en',
      });
      const res = { hr: rawHr, en: enTranslation };
      sizeNameCache.set(cacheKey, res);
      return res;
    } catch (e) {
      const res = { hr: rawHr, en: rawHr };
      sizeNameCache.set(cacheKey, res);
      return res;
    }
  }

  // If only EN provided → translate EN→HR
  if (rawEn && !rawHr) {
    try {
      const [hrTranslation] = await translate.translate(rawEn, {
        from: 'en',
        to: 'hr',
      });
      const res = { hr: hrTranslation, en: rawEn };
      sizeNameCache.set(cacheKey, res);
      return res;
    } catch (e) {
      const res = { hr: rawEn, en: rawEn };
      sizeNameCache.set(cacheKey, res);
      return res;
    }
  }

  // If nothing provided
  const res = { hr: '', en: '' };
  sizeNameCache.set(cacheKey, res);
  return res;
};

module.exports = {
  autoTranslate,
  translateSizeNameBoth,
  translateSizeNameFill,
};
