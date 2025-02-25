const express = require('express');
const claimLogController = require('../../controllers/claimLogController');
const {
  sysadminAuthenticateToken,
  checkSysadmin,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

router.post(
  '/claim-logs/claim-status',
  sysadminAuthenticateToken,
  checkSysadmin,
  claimLogController.handleClaimStatus,
);

router.get(
  '/claim-logs',
  sysadminAuthenticateToken,
  checkSysadmin,
  claimLogController.getAllClaimLogs,
);

module.exports = router;
