'use strict';
const { chatAgent } = require('../dinver-ai/agent');
const { fetchRestaurantDetails } = require('../dinver-ai/dataAccess');
const { v4: uuidv4 } = require('uuid');
const { AiThread, AiMessage } = require('../../models');
const { getMediaUrl } = require('../../config/cdn');

async function findOrCreateActiveThread({
  userId,
  restaurantId,
  titleSeed,
  threadId,
}) {
  const now = new Date();

  // Ako je poslan threadId, pokušaj pronaći postojeći thread
  if (threadId) {
    let t = await AiThread.findOne({
      where: {
        id: threadId,
        userId,
        isReadOnly: false,
      },
    });
    const expired =
      t && t.expiresAt && new Date(t.expiresAt).getTime() < now.getTime();
    if (t && !expired) {
      return t;
    }
    // Ako thread ne postoji ili je istekao, kreiraj novi s istim ID-om
    if (t && expired) {
      // Thread je istekao, kreiraj novi
      return await AiThread.create({
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
  }

  // Ako nema threadId ili thread ne postoji, kreiraj novi
  return await AiThread.create({
    id: threadId || uuidv4(),
    userId,
    restaurantId: restaurantId || null,
    title: (titleSeed || '').toString().slice(0, 120) || null,
    isReadOnly: false,
    messageCount: 0,
    lastMessageAt: now,
    expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  });
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
      let finalThreadId = threadId;
      if (userId) {
        const dbThread = await findOrCreateActiveThread({
          userId,
          restaurantId,
          titleSeed: message,
          threadId,
        });

        // Create a copy for database storage with raw keys (not transformed URLs)
        const normalizedForDb = JSON.parse(JSON.stringify(normalized));

        await appendDbMessage(dbThread, 'user', message);
        await appendDbMessage(
          dbThread,
          'assistant',
          normalizedForDb.text,
          normalizedForDb,
        );
        // Koristi ID iz baze umjesto originalnog threadId
        finalThreadId = dbThread.id;
      }

      // Transform thumbnailUrls in response (raw keys to CloudFront URLs)
      if (normalized.restaurants && Array.isArray(normalized.restaurants)) {
        normalized.restaurants = normalized.restaurants.map((restaurant) => ({
          ...restaurant,
          thumbnailUrl:
            restaurant.thumbnailUrl &&
            !restaurant.thumbnailUrl.includes('cloudfront.net')
              ? getMediaUrl(restaurant.thumbnailUrl, 'image')
              : restaurant.thumbnailUrl,
        }));
      }
      if (normalized.items && Array.isArray(normalized.items)) {
        normalized.items = normalized.items.map((item) => ({
          ...item,
          thumbnailUrl:
            item.thumbnailUrl && !item.thumbnailUrl.includes('cloudfront.net')
              ? getMediaUrl(item.thumbnailUrl, 'image')
              : item.thumbnailUrl,
        }));
      }
      if (
        normalized.restaurant &&
        normalized.restaurant.thumbnailUrl &&
        !normalized.restaurant.thumbnailUrl.includes('cloudfront.net')
      ) {
        normalized.restaurant.thumbnailUrl = getMediaUrl(
          normalized.restaurant.thumbnailUrl,
          'image',
        );
      }

      return res
        .status(200)
        .json({ reply: normalized, threadId: finalThreadId });
    } catch (err) {
      console.error('AI chat error', err);
      return res.status(500).json({ error: 'AI service error' });
    }
  },

  async getThreadByRestaurant(req, res) {
    try {
      const userId = req.user?.id;
      const { restaurantId } = req.params || {};
      if (!userId || !restaurantId) {
        return res.status(400).json({
          error: 'User must be logged in and restaurantId is required',
        });
      }
      const t = await AiThread.findOne({
        where: { userId, restaurantId },
        order: [['lastMessageAt', 'DESC']],
      });
      if (!t) return res.status(200).json({ thread: null });
      return res.status(200).json({
        thread: {
          threadId: t.id,
          createdAt: t.createdAt,
          lastMessageAt: t.lastMessageAt,
          messageCount: t.messageCount,
          readOnly: !!t.isReadOnly,
        },
      });
    } catch (err) {
      console.error('AI get thread error', err);
      return res.status(500).json({ error: 'AI service error' });
    }
  },

  async getThreads(req, res) {
    try {
      const userId = req.user?.id;
      const { limit = 10 } = req.query || {};
      if (!userId)
        return res.status(401).json({ error: 'User must be logged in' });

      const items = await AiThread.findAll({
        where: { userId },
        order: [['lastMessageAt', 'DESC']],
        limit: Number(limit) || 10,
        attributes: [
          'id',
          'restaurantId',
          'title',
          'isReadOnly',
          'messageCount',
          'lastMessageAt',
          'createdAt',
        ],
      });
      return res.status(200).json({ threads: items });
    } catch (err) {
      console.error('AI list threads error', err);
      return res.status(500).json({ error: 'AI service error' });
    }
  },

  async getThreadById(req, res) {
    try {
      const { id } = req.params || {};
      const userId = req.user?.id;
      if (!userId)
        return res.status(401).json({ error: 'User must be logged in' });

      const thread = await AiThread.findOne({
        where: { id, userId },
      });
      if (!thread) return res.status(404).json({ error: 'not found' });

      const messages = await AiMessage.findAll({
        where: { threadId: id },
        order: [['createdAt', 'ASC']],
        attributes: ['id', 'role', 'text', 'reply', 'createdAt'],
      });

      // Transform thumbnailUrls in reply objects (raw keys to CloudFront URLs)
      const transformedMessages = messages.map((msg) => {
        const messageData = msg.toJSON();
        if (messageData.reply && typeof messageData.reply === 'object') {
          // Transform restaurants array
          if (
            messageData.reply.restaurants &&
            Array.isArray(messageData.reply.restaurants)
          ) {
            messageData.reply.restaurants = messageData.reply.restaurants.map(
              (restaurant) => ({
                ...restaurant,
                thumbnailUrl:
                  restaurant.thumbnailUrl &&
                  !restaurant.thumbnailUrl.includes('cloudfront.net')
                    ? getMediaUrl(restaurant.thumbnailUrl, 'image')
                    : restaurant.thumbnailUrl,
              }),
            );
          }
          // Transform items array
          if (
            messageData.reply.items &&
            Array.isArray(messageData.reply.items)
          ) {
            messageData.reply.items = messageData.reply.items.map((item) => ({
              ...item,
              thumbnailUrl:
                item.thumbnailUrl &&
                !item.thumbnailUrl.includes('cloudfront.net')
                  ? getMediaUrl(item.thumbnailUrl, 'image')
                  : item.thumbnailUrl,
            }));
          }
          // Transform single restaurant
          if (
            messageData.reply.restaurant &&
            messageData.reply.restaurant.thumbnailUrl &&
            !messageData.reply.restaurant.thumbnailUrl.includes(
              'cloudfront.net',
            )
          ) {
            messageData.reply.restaurant.thumbnailUrl = getMediaUrl(
              messageData.reply.restaurant.thumbnailUrl,
              'image',
            );
          }
        }
        return messageData;
      });

      return res.status(200).json({
        thread: {
          id: thread.id,
          title: thread.title,
          restaurantId: thread.restaurantId,
          isReadOnly: thread.isReadOnly,
          messageCount: thread.messageCount,
          lastMessageAt: thread.lastMessageAt,
          createdAt: thread.createdAt,
          messages: transformedMessages,
        },
      });
    } catch (err) {
      console.error('AI get thread error', err);
      return res.status(500).json({ error: 'AI service error' });
    }
  },

  async deleteThread(req, res) {
    try {
      const { id } = req.params || {};
      const userId = req.user?.id;
      if (!userId)
        return res.status(401).json({ error: 'User must be logged in' });

      const thread = await AiThread.findOne({
        where: { id, userId },
      });
      if (!thread) return res.status(404).json({ error: 'not found' });

      const { AiMessage } = require('../../models');
      await AiMessage.destroy({ where: { threadId: id } });
      await thread.destroy();
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('AI delete thread error', err);
      return res.status(500).json({ error: 'AI service error' });
    }
  },
};
