const express = require('express');
const router = express.Router();
const aiController = require('../../controllers/aiController');
const {
  appApiKeyAuth,
  appOptionalAuth,
} = require('../../middleware/roleMiddleware');
const { aiLimiter } = require('../../middleware/rateLimitMiddleware');

/**
 * POST /api/app/ai/query
 * Body: { q: string, latitude?: number, longitude?: number, radiusKm?: number }
 */
router.post(
  '/ai/query',
  aiLimiter,
  appApiKeyAuth,
  appOptionalAuth,
  aiController.query,
);

module.exports = router;
