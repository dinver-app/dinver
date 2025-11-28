const express = require('express');
const supportTicketController = require('../../controllers/supportTicketController');
const {
  checkSysadmin,
  sysadminAuthenticateToken,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

// Get ticket statistics
router.get(
  '/support/stats',
  sysadminAuthenticateToken,
  checkSysadmin,
  supportTicketController.getTicketStats,
);

// Get all tickets
router.get(
  '/support/tickets',
  sysadminAuthenticateToken,
  checkSysadmin,
  supportTicketController.getAllTickets,
);

// Get single ticket by ID
router.get(
  '/support/tickets/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  supportTicketController.getTicketById,
);

// Respond to ticket
router.put(
  '/support/tickets/:id/respond',
  sysadminAuthenticateToken,
  checkSysadmin,
  supportTicketController.respondToTicket,
);

// Update ticket status only
router.put(
  '/support/tickets/:id/status',
  sysadminAuthenticateToken,
  checkSysadmin,
  supportTicketController.updateTicketStatus,
);

module.exports = router;
