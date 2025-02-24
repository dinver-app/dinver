const express = require('express');
const auditLogController = require('../../controllers/auditLogController');
const {
  adminAuthenticateToken,
  checkAdmin,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

router.get(
  '/audit-logs/restaurant/:restaurantId',
  adminAuthenticateToken,
  checkAdmin,
  auditLogController.getAuditLogsForRestaurant,
);

module.exports = router;
