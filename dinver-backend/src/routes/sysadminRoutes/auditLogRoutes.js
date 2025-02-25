const express = require('express');
const auditLogController = require('../../controllers/auditLogController');
const {
  sysadminAuthenticateToken,
  checkSysadmin,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

router.get(
  '/audit-logs',
  sysadminAuthenticateToken,
  checkSysadmin,
  auditLogController.getAuditLogs,
);

router.get(
  '/audit-logs/restaurant/:restaurantId',
  sysadminAuthenticateToken,
  checkSysadmin,
  auditLogController.getAuditLogsForRestaurant,
);

module.exports = router;
