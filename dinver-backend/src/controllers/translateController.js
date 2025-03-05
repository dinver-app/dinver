const { Translate } = require('@google-cloud/translate').v2;

const translate = new Translate({
  projectId: process.env.GOOGLE_PROJECT_ID,
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
});

const translateText = async (req, res) => {
  try {
    const { text, targetLang } = req.body;
    const sourceLang = targetLang === 'hr' ? 'en' : 'hr';

    const [translation] = await translate.translate(text, {
      from: sourceLang,
      to: targetLang,
    });

    res.json({ translatedText: translation });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Failed to translate text' });
  }
};

module.exports = {
  translateText,
};
