const express = require('express');
const router = express.Router();
const pushNotificationController = require('../../controllers/pushNotificationController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
  appOptionalAuth,
} = require('../../middleware/roleMiddleware');

// Register or update push token (optional auth - works with or without login)
router.post(
  '/push/register',
  appOptionalAuth,
  pushNotificationController.registerPushToken,
);

// Unregister push token (optional auth - works with or without login)
router.post(
  '/push/unregister',
  appOptionalAuth,
  pushNotificationController.unregisterPushToken,
);

// Get user's push tokens (requires auth)
router.get(
  '/push/tokens',
  appApiKeyAuth,
  appAuthenticateToken,
  pushNotificationController.getUserPushTokens,
);

module.exports = router;
