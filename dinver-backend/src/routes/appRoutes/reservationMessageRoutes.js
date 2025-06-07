const express = require('express');
const reservationMessageController = require('../../controllers/reservationMessageController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

// Get all messages for a reservation
router.get(
  '/reservations/:reservationId/messages',
  appApiKeyAuth,
  appAuthenticateToken,
  reservationMessageController.getReservationMessages,
);

// Send a new message
router.post(
  '/reservations/:reservationId/messages',
  appApiKeyAuth,
  appAuthenticateToken,
  reservationMessageController.sendMessage,
);

// Mark a single message as read
router.patch(
  '/messages/:messageId/read',
  appApiKeyAuth,
  appAuthenticateToken,
  reservationMessageController.markMessageAsRead,
);

// Mark multiple messages as read
router.post(
  '/messages/mark-read',
  appApiKeyAuth,
  appAuthenticateToken,
  reservationMessageController.markMessagesAsRead,
);

// Create a suggestion (restaurant admin only)
router.post(
  '/reservations/:reservationId/suggestions',
  appApiKeyAuth,
  appAuthenticateToken,
  reservationMessageController.createSuggestion,
);

module.exports = router;
