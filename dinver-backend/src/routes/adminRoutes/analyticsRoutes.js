const express = require('express');
const analyticsController = require('../../controllers/analyticsController');
const {
  adminAuthenticateToken,
  checkAdmin,
} = require('../../middleware/roleMiddleware');

const rateLimit = require('express-rate-limit');

const router = express.Router();

// Aggregated summary for admin dashboard
router.get(
  '/analytics/summary',
  adminAuthenticateToken,
  checkAdmin,
  analyticsController.getAnalyticsSummary,
);

module.exports = router;
