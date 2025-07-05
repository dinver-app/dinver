const express = require('express');
const analyticsController = require('../../controllers/analyticsController');
const adminController = require('../../controllers/adminController');
const {
  adminAuthenticateToken,
  checkAdmin,
} = require('../../middleware/roleMiddleware');

const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiter: max 20 requests per minute per IP
const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
});

// Aggregated summary for admin dashboard
router.get(
  '/analytics/summary',
  adminAuthenticateToken,
  checkAdmin,
  analyticsController.getAnalyticsSummary,
);

module.exports = router;
