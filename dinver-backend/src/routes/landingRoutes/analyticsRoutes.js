const express = require('express');
const analyticsController = require('../../controllers/analyticsController');
const { landingApiKeyAuth } = require('../../middleware/roleMiddleware');
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
  landingApiKeyAuth,
  analyticsController.logAnalyticsEvent,
);

module.exports = router;
