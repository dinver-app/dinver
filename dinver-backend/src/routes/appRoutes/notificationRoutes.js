const express = require('express');
const router = express.Router();
const { Notification, User, Restaurant } = require('../../../models');
const { appAuthenticateToken } = require('../../middleware/roleMiddleware');
const { Op } = require('sequelize');

/**
 * GET /api/app/notifications
 * Dohvati notifikacije trenutnog korisnika
 */
router.get('/', appAuthenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    // Dohvati notifikacije iz zadnjih 30 dana
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const notifications = await Notification.findAll({
      where: {
        userId,
        createdAt: {
          [Op.gte]: thirtyDaysAgo,
        },
      },
      include: [
        {
          model: User,
          as: 'actor',
          attributes: ['id', 'username', 'name', 'profileImage'],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'slug', 'thumbnailUrl', 'place'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Dohvati broj nepročitanih notifikacija
    const unreadCount = await Notification.count({
      where: {
        userId,
        isRead: false,
        createdAt: {
          [Op.gte]: thirtyDaysAgo,
        },
      },
    });

    // Ukupan broj notifikacija (za pagination)
    const totalCount = await Notification.count({
      where: {
        userId,
        createdAt: {
          [Op.gte]: thirtyDaysAgo,
        },
      },
    });

    res.json({
      notifications,
      unreadCount,
      totalCount,
      hasMore: parseInt(offset) + notifications.length < totalCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * POST /api/app/notifications/mark-all-read
 * Označi sve notifikacije kao pročitane
 */
router.post('/mark-all-read', appAuthenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [updatedCount] = await Notification.update(
      {
        isRead: true,
        readAt: new Date(),
      },
      {
        where: {
          userId,
          isRead: false,
        },
      },
    );

    res.json({
      success: true,
      markedAsRead: updatedCount,
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

/**
 * POST /api/app/notifications/:id/read
 * Označi jednu notifikaciju kao pročitanu
 */
router.post('/:id/read', appAuthenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({
      where: { id, userId },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (!notification.isRead) {
      await notification.update({
        isRead: true,
        readAt: new Date(),
      });
    }

    res.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

/**
 * GET /api/app/notifications/unread-count
 * Dohvati broj nepročitanih notifikacija
 */
router.get('/unread-count', appAuthenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Samo iz zadnjih 30 dana
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const unreadCount = await Notification.count({
      where: {
        userId,
        isRead: false,
        createdAt: {
          [Op.gte]: thirtyDaysAgo,
        },
      },
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

/**
 * DELETE /api/app/notifications/bulk
 * Obriši više notifikacija odjednom
 */
router.delete('/bulk', appAuthenticateToken, async (req, res) => {
  try {
    const { ids } = req.body;
    const userId = req.user.id;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const deleted = await Notification.destroy({
      where: {
        id: { [Op.in]: ids },
        userId,
      },
    });

    res.json({
      success: true,
      deletedCount: deleted,
    });
  } catch (error) {
    console.error('Error bulk deleting notifications:', error);
    res.status(500).json({ error: 'Failed to delete notifications' });
  }
});

/**
 * DELETE /api/app/notifications/:id
 * Obriši jednu notifikaciju
 */
router.delete('/:id', appAuthenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const deleted = await Notification.destroy({
      where: { id, userId },
    });

    if (deleted === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

/**
 * DELETE /api/app/notifications
 * Obriši sve notifikacije za korisnika
 */
router.delete('/', appAuthenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const deleted = await Notification.destroy({
      where: { userId },
    });

    res.json({
      success: true,
      deletedCount: deleted,
    });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    res.status(500).json({ error: 'Failed to delete notifications' });
  }
});

module.exports = router;
