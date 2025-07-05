const express = require('express');
const analyticsController = require('../../controllers/analyticsController');
const {
  checkSysadmin,
  sysadminAuthenticateToken,
} = require('../../middleware/roleMiddleware');

const rateLimit = require('express-rate-limit');

const router = express.Router();

// Aggregated summary for admin dashboard
router.get(
  '/analytics/summary',
  sysadminAuthenticateToken,
  checkSysadmin,
  analyticsController.getAnalyticsSummary,
);

module.exports = router;
