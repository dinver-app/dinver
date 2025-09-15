'use strict';
const { chatAgent } = require('../dinver-ai/agent');
const { fetchRestaurantDetails } = require('../dinver-ai/dataAccess');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async chat(req, res) {
    try {
      let {
        message,
        language,
        latitude,
        longitude,
        radiusKm,
        threadId,
        restaurantId,
      } = req.body || {};
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'message is required' });
      }
      if (!threadId) threadId = uuidv4();
      const reply = await chatAgent({
        message,
        language,
        latitude,
        longitude,
        radiusKm,
        threadId,
        forcedRestaurantId: restaurantId,
      });
      const normalized =
        reply && typeof reply === 'object'
          ? reply
          : { text: String(reply || '') };
      if (normalized.restaurantId && !normalized.restaurantName) {
        try {
          const details = await fetchRestaurantDetails(normalized.restaurantId);
          if (details?.name) normalized.restaurantName = details.name;
        } catch {}
      }
      // Always return as text/plain JSON to FE with { reply }
      return res.status(200).json({ reply: normalized, threadId });
    } catch (err) {
      console.error('AI chat error', err);
      return res.status(500).json({ error: 'AI service error' });
    }
  },
};
