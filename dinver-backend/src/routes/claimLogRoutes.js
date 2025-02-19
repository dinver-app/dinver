const express = require('express');
const claimLogController = require('../controllers/claimLogController');
const {
  authenticateToken,
  checkAdmin,
} = require('../middleware/roleMiddleware');

const router = express.Router();

router.post(
  '/claim-status',
  authenticateToken,
  checkAdmin,
  claimLogController.handleClaimStatus,
);

// New route to get all claim logs
router.get(
  '/',
  authenticateToken,
  checkAdmin,
  claimLogController.getAllClaimLogs,
);

module.exports = router;
