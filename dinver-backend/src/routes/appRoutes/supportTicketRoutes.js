const express = require('express');
const supportTicketController = require('../../controllers/supportTicketController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

// Create a new support ticket
router.post(
  '/support/tickets',
  appApiKeyAuth,
  appAuthenticateToken,
  supportTicketController.createTicket,
);

// Get user's tickets
router.get(
  '/support/tickets',
  appApiKeyAuth,
  appAuthenticateToken,
  supportTicketController.getUserTickets,
);

// Get single ticket by ID
router.get(
  '/support/tickets/:id',
  appApiKeyAuth,
  appAuthenticateToken,
  supportTicketController.getUserTicketById,
);

module.exports = router;
