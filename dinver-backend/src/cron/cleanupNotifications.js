const { Notification } = require('../../models');
const { Op } = require('sequelize');

/**
 * Obriši notifikacije starije od 30 dana
 * Pokreće se svaki dan u 02:00 AM
 */
const cleanupOldNotifications = async () => {
  try {
    console.log('[NotificationCleanup] Starting cleanup of old notifications...');

    // Obriši notifikacije starije od 30 dana
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const deletedCount = await Notification.destroy({
      where: {
        createdAt: {
          [Op.lt]: thirtyDaysAgo,
        },
      },
    });

    if (deletedCount > 0) {
      console.log(
        `[NotificationCleanup] Successfully deleted ${deletedCount} old notifications (older than 30 days)`,
      );
    } else {
      console.log(
        '[NotificationCleanup] No old notifications found to delete',
      );
    }

    return { success: true, deletedCount };
  } catch (error) {
    console.error('[NotificationCleanup] Error during cleanup:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Obriši pročitane notifikacije starije od 7 dana (opciono)
 * Ovo je aggressive cleanup za oslobađanje prostora u bazi
 */
const cleanupOldReadNotifications = async () => {
  try {
    console.log(
      '[NotificationCleanup] Starting cleanup of old read notifications...',
    );

    // Obriši pročitane notifikacije starije od 7 dana
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const deletedCount = await Notification.destroy({
      where: {
        isRead: true,
        readAt: {
          [Op.lt]: sevenDaysAgo,
        },
      },
    });

    if (deletedCount > 0) {
      console.log(
        `[NotificationCleanup] Successfully deleted ${deletedCount} old read notifications (older than 7 days)`,
      );
    } else {
      console.log(
        '[NotificationCleanup] No old read notifications found to delete',
      );
    }

    return { success: true, deletedCount };
  } catch (error) {
    console.error(
      '[NotificationCleanup] Error during read notifications cleanup:',
      error,
    );
    return { success: false, error: error.message };
  }
};

/**
 * Dohvati statistiku notifikacija
 */
const getNotificationStats = async () => {
  try {
    const totalCount = await Notification.count();
    const unreadCount = await Notification.count({ where: { isRead: false } });
    const readCount = await Notification.count({ where: { isRead: true } });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentCount = await Notification.count({
      where: {
        createdAt: {
          [Op.gte]: thirtyDaysAgo,
        },
      },
    });

    console.log('[NotificationStats]', {
      total: totalCount,
      unread: unreadCount,
      read: readCount,
      recent30Days: recentCount,
    });

    return {
      total: totalCount,
      unread: unreadCount,
      read: readCount,
      recent30Days: recentCount,
    };
  } catch (error) {
    console.error('[NotificationStats] Error getting stats:', error);
    return null;
  }
};

module.exports = {
  cleanupOldNotifications,
  cleanupOldReadNotifications,
  getNotificationStats,
};
