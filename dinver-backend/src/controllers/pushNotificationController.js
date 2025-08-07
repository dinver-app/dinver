const { PushToken, User } = require('../../models');
const { logAudit, ActionTypes, Entities } = require('../../utils/auditLogger');

// Register or update push token
const registerPushToken = async (req, res) => {
  try {
    const { token, deviceInfo, platform } = req.body;
    const userId = req.user ? req.user.id : null;

    if (!token || !platform) {
      return res.status(400).json({
        error: 'Token and platform are required',
      });
    }

    // Validate platform
    const validPlatforms = ['iOS', 'Android', 'Web'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({
        error: 'Invalid platform. Must be iOS, Android, or Web',
      });
    }

    // Check if token already exists
    let pushToken = await PushToken.findOne({
      where: { token },
    });

    if (pushToken) {
      // Update existing token
      await pushToken.update({
        userId,
        deviceInfo,
        platform,
        lastSeen: new Date(),
        isActive: true,
      });

      // Log audit if user is logged in
      if (userId) {
        await logAudit({
          userId,
          action: ActionTypes.UPDATE,
          entity: Entities.PUSH_TOKEN,
          entityId: pushToken.id,
          changes: {
            old: { userId: pushToken.userId },
            new: { userId, deviceInfo, platform },
          },
        });
      }
    } else {
      // Create new token
      pushToken = await PushToken.create({
        token,
        userId,
        deviceInfo,
        platform,
        lastSeen: new Date(),
        isActive: true,
      });

      // Log audit if user is logged in
      if (userId) {
        await logAudit({
          userId,
          action: ActionTypes.CREATE,
          entity: Entities.PUSH_TOKEN,
          entityId: pushToken.id,
          changes: { new: { token, platform, deviceInfo } },
        });
      }
    }

    res.json({
      success: true,
      message: 'Push token registered successfully',
      data: {
        id: pushToken.id,
        token: pushToken.token,
        platform: pushToken.platform,
        deviceInfo: pushToken.deviceInfo,
        isActive: pushToken.isActive,
      },
    });
  } catch (error) {
    console.error('Error registering push token:', error);
    res.status(500).json({
      error: 'Failed to register push token',
      details: error.message,
    });
  }
};

// Unregister push token (mark as inactive)
const unregisterPushToken = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user ? req.user.id : null;

    if (!token) {
      return res.status(400).json({
        error: 'Token is required',
      });
    }

    const pushToken = await PushToken.findOne({
      where: { token },
    });

    if (!pushToken) {
      return res.status(404).json({
        error: 'Push token not found',
      });
    }

    // Only allow unregistering if user owns the token or token has no user
    if (pushToken.userId && pushToken.userId !== userId) {
      return res.status(403).json({
        error: 'Not authorized to unregister this token',
      });
    }

    await pushToken.update({
      isActive: false,
    });

    // Log audit if user is logged in
    if (userId) {
      await logAudit({
        userId,
        action: ActionTypes.UPDATE,
        entity: Entities.PUSH_TOKEN,
        entityId: pushToken.id,
        changes: {
          old: { isActive: true },
          new: { isActive: false },
        },
      });
    }

    res.json({
      success: true,
      message: 'Push token unregistered successfully',
    });
  } catch (error) {
    console.error('Error unregistering push token:', error);
    res.status(500).json({
      error: 'Failed to unregister push token',
      details: error.message,
    });
  }
};

// Get user's active push tokens
const getUserPushTokens = async (req, res) => {
  try {
    const userId = req.user.id;

    const pushTokens = await PushToken.findAll({
      where: {
        userId,
        isActive: true,
      },
      attributes: ['id', 'token', 'platform', 'deviceInfo', 'lastSeen'],
      order: [['lastSeen', 'DESC']],
    });

    res.json({
      success: true,
      data: pushTokens,
    });
  } catch (error) {
    console.error('Error getting user push tokens:', error);
    res.status(500).json({
      error: 'Failed to get push tokens',
      details: error.message,
    });
  }
};

// Clean up inactive tokens (admin function)
const cleanupInactiveTokens = async (req, res) => {
  try {
    // Find tokens that haven't been seen in 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const inactiveTokens = await PushToken.findAll({
      where: {
        lastSeen: {
          [require('sequelize').Op.lt]: sixMonthsAgo,
        },
        isActive: true,
      },
    });

    // Mark them as inactive
    await PushToken.update(
      {
        isActive: false,
      },
      {
        where: {
          lastSeen: {
            [require('sequelize').Op.lt]: sixMonthsAgo,
          },
          isActive: true,
        },
      },
    );

    res.json({
      success: true,
      message: `Marked ${inactiveTokens.length} tokens as inactive`,
      count: inactiveTokens.length,
    });
  } catch (error) {
    console.error('Error cleaning up inactive tokens:', error);
    res.status(500).json({
      error: 'Failed to cleanup inactive tokens',
      details: error.message,
    });
  }
};

// Get statistics about push tokens (admin function)
const getPushTokenStats = async (req, res) => {
  try {
    const totalTokens = await PushToken.count();
    const activeTokens = await PushToken.count({
      where: { isActive: true },
    });
    const tokensWithUsers = await PushToken.count({
      where: {
        userId: {
          [require('sequelize').Op.ne]: null,
        },
      },
    });

    const platformStats = await PushToken.findAll({
      attributes: [
        'platform',
        [require('sequelize').fn('COUNT', '*'), 'count'],
      ],
      where: { isActive: true },
      group: ['platform'],
    });

    res.json({
      success: true,
      data: {
        total: totalTokens,
        active: activeTokens,
        withUsers: tokensWithUsers,
        platforms: platformStats,
      },
    });
  } catch (error) {
    console.error('Error getting push token stats:', error);
    res.status(500).json({
      error: 'Failed to get push token statistics',
      details: error.message,
    });
  }
};

module.exports = {
  registerPushToken,
  unregisterPushToken,
  getUserPushTokens,
  cleanupInactiveTokens,
  getPushTokenStats,
};
