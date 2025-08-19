const express = require('express');
const referralController = require('../../controllers/referralController');
const {
  sysadminAuthenticateToken,
  checkSysadmin,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

// Admin routes for referral management
router.get(
  '/referrals',
  sysadminAuthenticateToken,
  checkSysadmin,
  referralController.getAllReferrals,
);

router.get(
  '/referrals/stats',
  sysadminAuthenticateToken,
  checkSysadmin,
  referralController.getReferralStats,
);

module.exports = router;
