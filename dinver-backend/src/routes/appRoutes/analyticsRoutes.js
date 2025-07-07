const express = require('express');
const analyticsController = require('../../controllers/analyticsController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
} = require('../../middleware/roleMiddleware');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiter: max 20 requests per minute per IP
const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
});

// Log analytics event (rate-limited, API key protected)
router.post(
  '/analytics',
  analyticsLimiter,
  appApiKeyAuth,
  analyticsController.logAnalyticsEvent,
);

router.get(
  '/analytics/summary',
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
  analyticsController.getAnalyticsSummary,
);

module.exports = router;
