const express = require('express');
const router = express.Router();
const newsletterController = require('../../controllers/newsletterController');
const {
  sysadminAuthenticateToken,
  checkSysadmin,
} = require('../../middleware/roleMiddleware');

// Protected admin routes
router.get(
  '/newsletter/stats',
  sysadminAuthenticateToken,
  checkSysadmin,
  newsletterController.getStats,
);

router.post(
  '/newsletter/force-unsubscribe',
  newsletterController.forceUnsubscribe,
);

module.exports = router;
