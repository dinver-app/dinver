'use strict';

const express = require('express');
const router = express.Router();
const { logFeedback } = require('../../utils/metrics');

// Minimal thumbs up/down endpoint
router.post('/ai/feedback', async (req, res) => {
  try {
    const { threadId, intent, restaurantId, thumbs, reason, message } =
      req.body || {};
    logFeedback({
      threadId: threadId || null,
      intent: intent || null,
      restaurantId: restaurantId || null,
      thumbs: thumbs === 'up' ? 'up' : 'down',
      reason: reason || null,
      message: message || null,
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false });
  }
});

module.exports = router;

const analyticsController = require('../../controllers/analyticsController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
} = require('../../middleware/roleMiddleware');
const rateLimit = require('express-rate-limit');

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

router.get('/popular-restaurants', analyticsController.getPopularRestaurants);

module.exports = router;
