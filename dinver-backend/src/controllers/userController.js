const { User } = require('../../models');
const {
  UserPoints,
  Review,
  UserFavorite,
  Reservation,
} = require('../../models');

const updateUserLanguage = async (req, res) => {
  const { language } = req.body;
  const user = await User.findByPk(req.user.id);
  await user.update({ language });
  res.status(200).json({ message: 'Language updated successfully' });
};

const getUserLanguage = async (req, res) => {
  const user = await User.findByPk(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.status(200).json({ language: user.language });
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

const getStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user points
    const userPoints = await UserPoints.findOne({
      where: { userId },
      attributes: ['totalPoints', 'level'],
    });

    // Get review count
    const reviewCount = await Review.count({
      where: { userId },
    });

    // Get favorite restaurants count
    const favoriteCount = await UserFavorite.count({
      where: { userId },
    });

    // Get completed reservations count
    const completedReservationsCount = await Reservation.count({
      where: {
        userId,
        status: 'completed',
      },
    });

    res.status(200).json({
      points: userPoints ? userPoints.totalPoints : 0,
      level: userPoints ? userPoints.level : 1,
      reviewCount,
      favoriteCount,
      completedReservationsCount,
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
};

module.exports = {
  updateUserLanguage,
  getUserLanguage,
  getUserById,
  getStats,
};
