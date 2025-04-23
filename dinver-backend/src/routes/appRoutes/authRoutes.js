const express = require('express');
const authController = require('../../controllers/authController');
const {
  appAuthenticateToken,
  appApiKeyAuth,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

router.post('/auth/login', authController.login);

router.post('/auth/register', authController.register);

router.get('/auth/logout', authController.logout);

router.get('/auth/check-auth', authController.checkAuth);

router.post('/auth/social-login', authController.socialLogin);

// Verifikacijske rute
router.post(
  '/auth/verify-email',
  appApiKeyAuth,
  appAuthenticateToken,
  authController.requestEmailVerification,
);
router.get('/auth/verify-email/:token', authController.verifyEmail);
router.post(
  '/auth/verify-phone',
  appApiKeyAuth,
  appAuthenticateToken,
  authController.requestPhoneVerification,
);
router.post(
  '/auth/verify-phone/confirm',
  appApiKeyAuth,
  appAuthenticateToken,
  authController.verifyPhone,
);

router.get(
  '/auth/verification-status',
  appApiKeyAuth,
  appAuthenticateToken,
  authController.getVerificationStatus,
);

module.exports = router;
