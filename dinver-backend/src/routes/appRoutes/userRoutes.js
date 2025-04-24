const express = require('express');
const userController = require('../../controllers/userController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

// Javni profil korisnika
router.get(
  '/user/profile',
  appApiKeyAuth,
  appAuthenticateToken,
  userController.getUserProfile,
);

// Ažuriranje profila korisnika
router.patch(
  '/user/profile',
  appApiKeyAuth,
  appAuthenticateToken,
  userController.updateUserProfile,
);

// Detaljne statistike za autentificiranog korisnika
router.get(
  '/user/stats',
  appApiKeyAuth,
  appAuthenticateToken,
  userController.getUserStats,
);

module.exports = router;
