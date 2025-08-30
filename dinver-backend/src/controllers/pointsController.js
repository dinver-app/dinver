const {
  UserPoints,
  UserPointsHistory,
  User,
  Restaurant,
  Sequelize,
} = require('../../models');
const { Op } = require('sequelize');

// Map action types to human-friendly labels and groups
const ACTION_META = {
  review_add: { title: 'Review written', group: 'review', direction: 'earn' },
  review_long: {
    title: 'Long review bonus',
    group: 'review',
    direction: 'earn',
  },
  review_with_photo: {
    title: 'Photo in review bonus',
    group: 'review',
    direction: 'earn',
  },
  visit_qr: {
    title: 'Restaurant visit confirmed',
    group: 'visit',
    direction: 'earn',
  },
  reservation_visit: {
    title: 'Reservation arrival bonus',
    group: 'visit',
    direction: 'earn',
  },
  achievement_unlocked: {
    title: 'Achievement unlocked',
    group: 'achievement',
    direction: 'earn',
  },
  referral_registration_referrer: {
    title: 'Referral: friend registered (your bonus)',
    group: 'referral',
    direction: 'earn',
  },
  referral_registration_referred: {
    title: 'Referral: registered with a code',
    group: 'referral',
    direction: 'earn',
  },
  referral_visit_referrer: {
    title: 'Referral: friend’s first visit (your bonus)',
    group: 'referral',
    direction: 'earn',
  },
  points_spent_coupon: {
    title: 'Coupon claimed (points spent)',
    group: 'spend',
    direction: 'spend',
  },
};

function formatTransaction(row) {
  const meta = ACTION_META[row.actionType] || {
    title: row.description || row.actionType,
    group: 'other',
    direction: row.points >= 0 ? 'earn' : 'spend',
  };

  return {
    id: row.id,
    userId: row.userId,
    direction: meta.direction, // 'earn' or 'spend'
    actionType: row.actionType,
    group: meta.group,
    title: meta.title,
    description: row.description,
    points: row.points, // signed integer
    referenceId: row.referenceId,
    restaurant: row.restaurant
      ? { id: row.restaurant.id, name: row.restaurant.name }
      : null,
    createdAt: row.createdAt,
  };
}

// Get paginated user transactions (earn and spend) with optional filters
const getUserPointsTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, type, actionType } = req.query;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    const where = { userId };
    if (type === 'earn') where.points = { [Op.gt]: 0 };
    if (type === 'spend') where.points = { [Op.lt]: 0 };
    if (actionType) where.actionType = actionType;

    const { count, rows } = await UserPointsHistory.findAndCountAll({
      where,
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset,
    });

    const transactions = rows.map(formatTransaction);

    res.json({
      transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages: Math.ceil(count / limitNum),
      },
      filters: { type: type || 'all', actionType: actionType || null },
    });
  } catch (error) {
    console.error('Error fetching points transactions:', error);
    res.status(500).json({ error: 'Failed to fetch points transactions' });
  }
};

// Get user's total points and level
const getUserPoints = async (req, res) => {
  try {
    const userId = req.user.id;

    const userPoints = await UserPoints.findOne({
      where: { userId: userId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName'],
        },
      ],
    });

    if (!userPoints) {
      return res.status(404).json({ error: 'User points not found' });
    }

    res.json(userPoints);
  } catch (error) {
    console.error('Error fetching user points:', error);
    res.status(500).json({ error: 'Failed to fetch user points' });
  }
};

// Get points statistics per restaurant
const getRestaurantPointsStats = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const pointsStats = await UserPointsHistory.findAll({
      where: { restaurantId: restaurantId },
      attributes: [
        [Sequelize.fn('sum', Sequelize.col('points')), 'totalPoints'],
        [
          Sequelize.fn(
            'count',
            Sequelize.fn('distinct', Sequelize.col('userId')),
          ),
          'uniqueUsers',
        ],
      ],
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['name'],
          required: false,
        },
      ],
      group: ['restaurant.id', 'restaurant.name'],
    });

    // Ako nema rezultata, vrati praznu statistiku
    if (!pointsStats.length) {
      return res.json({
        totalPoints: 0,
        uniqueUsers: 0,
        restaurant: null,
      });
    }

    res.json(pointsStats[0]);
  } catch (error) {
    console.error('Error fetching restaurant points stats:', error);
    res
      .status(500)
      .json({ error: 'Failed to fetch restaurant points statistics' });
  }
};

// Get global points statistics
const getGlobalPointsStats = async (req, res) => {
  try {
    // Get level distribution
    const levelStats = await UserPoints.findAll({
      attributes: [
        'level',
        [Sequelize.fn('count', Sequelize.col('userId')), 'userCount'],
        [Sequelize.fn('sum', Sequelize.col('totalPoints')), 'totalPoints'],
      ],
      group: ['level'],
      order: [['level', 'ASC']],
    });

    // Get top users by points
    const topUsers = await UserPoints.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
      order: [['totalPoints', 'DESC']],
      limit: 10,
    });

    // Get recent point activities
    const recentActivities = await UserPointsHistory.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName'],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: 20,
    });

    res.json({
      levelDistribution: levelStats,
      topUsers: topUsers.map((up) => ({
        user: up.user,
        totalPoints: up.totalPoints,
        level: up.level,
        levelName: up.getLevelName(),
      })),
      recentActivities: recentActivities.map((activity) => ({
        id: activity.id,
        userId: activity.userId,
        userName: activity.user
          ? `${activity.user.firstName} ${activity.user.lastName}`
          : 'Unknown',
        restaurantId: activity.restaurantId,
        restaurantName: activity.restaurant
          ? activity.restaurant.name
          : 'Unknown',
        points: activity.points,
        action: activity.action,
        createdAt: activity.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching global points stats:', error);
    res.status(500).json({ error: 'Failed to fetch points statistics' });
  }
};

module.exports = {
  getUserPointsTransactions,
  getUserPoints,
  getRestaurantPointsStats,
  getGlobalPointsStats,
};
