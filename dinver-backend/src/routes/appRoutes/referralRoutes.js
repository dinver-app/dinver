const express = require('express');
const referralController = require('../../controllers/referralController');
const {
  appAuthenticateToken,
  appApiKeyAuth,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

// Public routes
router.get(
  '/referrals/validate/:code',
  appApiKeyAuth,
  referralController.validateReferralCode,
);

// Protected routes (require authentication)
router.get(
  '/referrals/my-code',
  appApiKeyAuth,
  appAuthenticateToken,
  referralController.getMyReferralCode,
);

router.get(
  '/referrals/my-referrals',
  appApiKeyAuth,
  appAuthenticateToken,
  referralController.getMyReferrals,
);

router.get(
  '/referrals/my-rewards',
  appApiKeyAuth,
  appAuthenticateToken,
  referralController.getMyRewards,
);

module.exports = router;
