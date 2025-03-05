const { Translate } = require('@google-cloud/translate').v2;

const translate = new Translate({
  projectId: process.env.GOOGLE_PROJECT_ID,
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
});

const autoTranslate = async (translations) => {
  const hrTranslation = translations.find((t) => t.language === 'hr');
  const enTranslation = translations.find((t) => t.language === 'en');

  if (hrTranslation?.description && !enTranslation?.description) {
    const [descriptionTranslation] = await translate.translate(
      hrTranslation.description,
      {
        from: 'hr',
        to: 'en',
      },
    );
    enTranslation.description = descriptionTranslation;
  } else if (enTranslation?.description && !hrTranslation?.description) {
    const [descriptionTranslation] = await translate.translate(
      enTranslation.description,
      {
        from: 'en',
        to: 'hr',
      },
    );
    hrTranslation.description = descriptionTranslation;
  }

  if (!hrTranslation || !enTranslation) {
    const sourceLang = hrTranslation ? 'hr' : 'en';
    const sourceTranslation = hrTranslation || enTranslation;
    const targetLang = sourceLang === 'hr' ? 'en' : 'hr';

    const [nameTranslation] = await translate.translate(
      sourceTranslation.name,
      {
        from: sourceLang,
        to: targetLang,
      },
    );

    let descriptionTranslation = '';
    if (sourceTranslation.description) {
      [descriptionTranslation] = await translate.translate(
        sourceTranslation.description,
        {
          from: sourceLang,
          to: targetLang,
        },
      );
    }

    translations.push({
      language: targetLang,
      name: nameTranslation,
      description: descriptionTranslation || '',
    });
  }

  return translations;
};

module.exports = {
  autoTranslate,
};
