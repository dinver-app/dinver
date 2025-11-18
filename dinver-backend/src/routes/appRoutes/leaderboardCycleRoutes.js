const express = require('express');
const {
  appApiKeyAuth,
  appAuthenticateToken,
  appOptionalAuth,
} = require('../../middleware/roleMiddleware');
const leaderboardCycleController = require('../../controllers/leaderboardCycleController');

const router = express.Router();

// Get active cycle with user's position (auth optional)
router.get(
  '/leaderboard/active',
  appApiKeyAuth,
  appOptionalAuth,
  leaderboardCycleController.getActiveCycle,
);

// Get leaderboard for a specific cycle
router.get(
  '/leaderboard/cycles/:id',
  appApiKeyAuth,
  appAuthenticateToken,
  leaderboardCycleController.getCycleLeaderboard,
);

// Get past cycles with winners
router.get(
  '/leaderboard/history',
  appApiKeyAuth,
  appAuthenticateToken,
  leaderboardCycleController.getCycleHistory,
);

// Get user's participation history and stats
router.get(
  '/leaderboard/my-stats',
  appApiKeyAuth,
  appAuthenticateToken,
  leaderboardCycleController.getUserCycleStats,
);

module.exports = router;
