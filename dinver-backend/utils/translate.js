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
    enTranslation.description === undefined
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
    hrTranslation.description === undefined
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
    enTranslation.name === undefined
  ) {
    const [nameTranslation] = await translate.translate(hrTranslation.name, {
      from: 'hr',
      to: 'en',
    });
    enTranslation.name = nameTranslation;
  } else if (
    enTranslation.name !== undefined &&
    enTranslation.name !== '' &&
    hrTranslation.name === undefined
  ) {
    const [nameTranslation] = await translate.translate(enTranslation.name, {
      from: 'en',
      to: 'hr',
    });
    hrTranslation.name = nameTranslation;
  }

  return translations;
};

module.exports = {
  autoTranslate,
};
