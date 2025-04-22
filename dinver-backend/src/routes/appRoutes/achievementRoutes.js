const express = require('express');
const achievementController = require('../../controllers/achievementController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

// Dohvati sve achievemente korisnika
router.get(
  '/achievements',
  appApiKeyAuth,
  appAuthenticateToken,
  achievementController.getUserAchievements,
);

module.exports = router;
