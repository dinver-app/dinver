const {
  UserPoints,
  UserPointsHistory,
  User,
  Restaurant,
  Sequelize,
} = require('../../models');
const { Op } = require('sequelize');

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
  getUserPoints,
  getRestaurantPointsStats,
  getGlobalPointsStats,
};
