'use strict';
const { chatAgent } = require('../dinver-ai/agent');

module.exports = {
  async chat(req, res) {
    try {
      const { message, language, latitude, longitude, radiusKm } =
        req.body || {};
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'message is required' });
      }
      const reply = await chatAgent({
        message,
        language,
        latitude,
        longitude,
        radiusKm,
      });
      // Always return as text/plain JSON to FE with { reply }
      return res.status(200).json({ reply });
    } catch (err) {
      console.error('AI chat error', err);
      return res.status(500).json({ error: 'AI service error' });
    }
  },
};
