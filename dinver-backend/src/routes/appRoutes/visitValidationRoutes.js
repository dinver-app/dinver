const express = require('express');
const visitValidationController = require('../../controllers/visitValidationController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

router.post(
  '/visit-qr/generate',
  appApiKeyAuth,
  appAuthenticateToken,
  visitValidationController.generateUserVisitToken,
);

router.post(
  '/restaurants/:restaurantId/scan-user',
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
  visitValidationController.adminScanUserToken,
);

// Get validation status for restaurant (can leave review)
router.get(
  '/restaurants/:restaurantId/validation-status',
  appApiKeyAuth,
  appAuthenticateToken,
  visitValidationController.getValidationStatus,
);

module.exports = router;
