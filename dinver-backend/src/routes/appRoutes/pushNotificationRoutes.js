const express = require('express');
const router = express.Router();
const pushNotificationController = require('../../controllers/pushNotificationController');
const { authenticateToken } = require('../../middleware/authMiddleware');

// Register or update push token (public route - no auth required)
router.post('/push/register', pushNotificationController.registerPushToken);

// Unregister push token (public route - no auth required)
router.post('/push/unregister', pushNotificationController.unregisterPushToken);

// Get user's push tokens (requires auth)
router.get(
  '/push/tokens',
  authenticateToken,
  pushNotificationController.getUserPushTokens,
);

module.exports = router;
