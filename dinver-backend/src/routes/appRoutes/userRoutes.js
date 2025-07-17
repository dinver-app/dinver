const express = require('express');
const userController = require('../../controllers/userController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
} = require('../../middleware/roleMiddleware');
const upload = require('../../../utils/uploadMiddleware');

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

// Ažuriranje profilne slike
router.post(
  '/user/profile/image',
  appApiKeyAuth,
  appAuthenticateToken,
  upload.single('image'),
  userController.updateProfileImage,
);

// Brisanje profilne slike
router.delete(
  '/user/profile/image',
  appApiKeyAuth,
  appAuthenticateToken,
  userController.deleteProfileImage,
);

// Promjena lozinke
router.post(
  '/user/change-password',
  appApiKeyAuth,
  appAuthenticateToken,
  userController.changePassword,
);

// Dohvati restorane kojima je korisnik vlasnik
router.get(
  '/user/owned-restaurants',
  appApiKeyAuth,
  appAuthenticateToken,
  userController.getOwnedRestaurants,
);

// Brisanje korisničkog računa
router.delete(
  '/user/account',
  appApiKeyAuth,
  appAuthenticateToken,
  userController.deleteAccount,
);

module.exports = router;
