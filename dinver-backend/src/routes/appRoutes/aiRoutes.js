const express = require('express');
const router = express.Router();
const aiController = require('../../controllers/aiController');

// POST /api/app/ai/chat
router.post('/ai/chat', aiController.chat);

// GET last thread for user+restaurant (read-only)
router.get('/ai/threads/:restaurantId', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { restaurantId } = req.params || {};
    if (!userId || !restaurantId) {
      return res
        .status(400)
        .json({ error: 'User must be logged in and restaurantId is required' });
    }
    const { AiThread } = require('../../models');
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
});

// DB-backed: list, detail, delete (optional UI)
router.get('/ai/db/threads', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { limit = 10 } = req.query || {};
    if (!userId)
      return res.status(401).json({ error: 'User must be logged in' });
    const { AiThread } = require('../../models');
    const items = await AiThread.findAll({
      where: { userId },
      order: [['lastMessageAt', 'DESC']],
      limit: Number(limit) || 10,
      attributes: [
        'id',
        'userId',
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
});

router.get('/ai/db/threads/:id', async (req, res) => {
  try {
    const { id } = req.params || {};
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ error: 'User must be logged in' });
    const { AiThread, AiMessage } = require('../../models');
    const thread = await AiThread.findOne({
      where: { id, userId },
    });
    if (!thread) return res.status(404).json({ error: 'not found' });
    const messages = await AiMessage.findAll({
      where: { threadId: id },
      order: [['createdAt', 'ASC']],
      attributes: ['id', 'role', 'text', 'reply', 'createdAt'],
    });
    return res.status(200).json({ thread, messages });
  } catch (err) {
    console.error('AI get thread detail error', err);
    return res.status(500).json({ error: 'AI service error' });
  }
});

router.delete('/ai/db/threads/:id', async (req, res) => {
  try {
    const { id } = req.params || {};
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ error: 'User must be logged in' });
    const { AiThread } = require('../../models');
    const n = await AiThread.destroy({ where: { id, userId } });
    return res.status(200).json({ deleted: n > 0 });
  } catch (err) {
    console.error('AI delete thread error', err);
    return res.status(500).json({ error: 'AI service error' });
  }
});

module.exports = router;
