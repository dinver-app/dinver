const express = require('express');
const feedController = require('../../controllers/feedController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
} = require('../../middleware/roleMiddleware');
const { validateLocation } = require('../../middleware/validationMiddleware');

const router = express.Router();

// Get feed (public with optional auth)
router.get('/feed', appApiKeyAuth, validateLocation, feedController.getFeed);

// Record interaction with post (like, save, share, etc.)
router.post(
  '/feed/posts/:postId/interaction',
  appApiKeyAuth,
  appAuthenticateToken,
  feedController.recordInteraction,
);

// Update view metrics
router.post(
  '/feed/posts/:postId/view',
  appApiKeyAuth,
  feedController.updateViewMetrics,
);

module.exports = router;
