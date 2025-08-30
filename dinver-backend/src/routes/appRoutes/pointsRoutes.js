const express = require('express');
const {
  appApiKeyAuth,
  appAuthenticateToken,
} = require('../../middleware/roleMiddleware');
const { UserPoints, UserPointsHistory } = require('../../../models');
const pointsController = require('../../controllers/pointsController');

const router = express.Router();

// Paginated user transactions (earn and spend)
router.get(
  '/points/transactions',
  appApiKeyAuth,
  appAuthenticateToken,
  pointsController.getUserPointsTransactions,
);

// Dohvati povijest bodova korisnika
router.get(
  '/points/history',
  appApiKeyAuth,
  appAuthenticateToken,
  async (req, res) => {
    try {
      const pointsHistory = await UserPointsHistory.findAll({
        where: { userId: req.user.id },
        order: [['createdAt', 'DESC']],
      });

      res.json(pointsHistory);
    } catch (error) {
      console.error('Error fetching points history:', error);
      res.status(500).json({ error: 'Failed to fetch points history' });
    }
  },
);

// Dohvati ukupne bodove korisnika
router.get('/points', appApiKeyAuth, appAuthenticateToken, async (req, res) => {
  try {
    const userPoints = await UserPoints.findOne({
      where: { userId: req.user.id },
    });

    res.json({
      totalPoints: userPoints ? userPoints.totalPoints : 0,
    });
  } catch (error) {
    console.error('Error fetching user points:', error);
    res.status(500).json({ error: 'Failed to fetch user points' });
  }
});

// Get user's total points and level
router.get(
  '/points/user',
  appAuthenticateToken,
  pointsController.getUserPoints,
);

// Get points statistics for a specific restaurant
router.get(
  '/points/restaurant/:restaurantId',
  appAuthenticateToken,
  pointsController.getRestaurantPointsStats,
);

// Get global points statistics
router.get(
  '/points/stats',
  appAuthenticateToken,
  pointsController.getGlobalPointsStats,
);

module.exports = router;
