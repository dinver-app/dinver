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
      where: { user_id: userId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['first_name', 'last_name'],
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
      where: { restaurant_id: restaurantId },
      attributes: [
        [Sequelize.fn('sum', Sequelize.col('points')), 'total_points'],
        [
          Sequelize.fn(
            'count',
            Sequelize.fn('distinct', Sequelize.col('user_id')),
          ),
          'unique_users',
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
        total_points: 0,
        unique_users: 0,
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
        [Sequelize.fn('count', Sequelize.col('user_id')), 'user_count'],
        [Sequelize.fn('sum', Sequelize.col('total_points')), 'total_points'],
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
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
      ],
      order: [['total_points', 'DESC']],
      limit: 10,
    });

    // Get recent point activities
    const recentActivities = await UserPointsHistory.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name'],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit: 20,
    });

    res.json({
      levelDistribution: levelStats,
      topUsers: topUsers.map((up) => ({
        user: up.user,
        totalPoints: up.total_points,
        level: up.level,
        levelName: up.getLevelName(),
      })),
      recentActivities: recentActivities.map((activity) => ({
        id: activity.id,
        userId: activity.user_id,
        userName: activity.user
          ? `${activity.user.first_name} ${activity.user.last_name}`
          : 'Unknown',
        restaurantId: activity.restaurant_id,
        restaurantName: activity.restaurant
          ? activity.restaurant.name
          : 'Unknown',
        points: activity.points,
        action: activity.action,
        createdAt: activity.created_at,
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
