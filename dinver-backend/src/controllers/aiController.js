'use strict';
const { chatAgent } = require('../dinver-ai/agent');
const { fetchRestaurantDetails } = require('../dinver-ai/dataAccess');
const { v4: uuidv4 } = require('uuid');
const { AiThread, AiMessage } = require('../../models');

async function findOrCreateActiveThread({ userId, restaurantId, titleSeed }) {
  const now = new Date();
  // Try to find active (not read-only, not expired)
  let t = await AiThread.findOne({
    where: {
      userId,
      restaurantId: restaurantId || null,
      isReadOnly: false,
    },
    order: [['createdAt', 'DESC']],
  });
  const expired =
    t && t.expiresAt && new Date(t.expiresAt).getTime() < now.getTime();
  if (!t || expired) {
    t = await AiThread.create({
      id: uuidv4(),
      userId,
      restaurantId: restaurantId || null,
      title: (titleSeed || '').toString().slice(0, 120) || null,
      isReadOnly: false,
      messageCount: 0,
      lastMessageAt: now,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    });
  }
  return t;
}

async function appendDbMessage(thread, role, text, reply = null) {
  await AiMessage.create({
    id: uuidv4(),
    threadId: thread.id,
    role,
    text,
    reply: reply || null,
  });
  const now = new Date();
  const newCount = (thread.messageCount || 0) + 1;
  const shouldLock =
    newCount >= 8 || (thread.expiresAt && new Date(thread.expiresAt) < now);
  await thread.update({
    messageCount: newCount,
    lastMessageAt: now,
    isReadOnly: shouldLock ? true : thread.isReadOnly,
  });
}

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

      const userId = req.user?.id; // iz JWT middleware-a

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

      // Spremi u bazu samo ako je korisnik logiran
      if (userId) {
        const dbThread = await findOrCreateActiveThread({
          userId,
          restaurantId,
          titleSeed: message,
        });
        await appendDbMessage(dbThread, 'user', message);
        await appendDbMessage(
          dbThread,
          'assistant',
          normalized.text,
          normalized,
        );
      }

      return res.status(200).json({ reply: normalized, threadId });
    } catch (err) {
      console.error('AI chat error', err);
      return res.status(500).json({ error: 'AI service error' });
    }
  },
};
