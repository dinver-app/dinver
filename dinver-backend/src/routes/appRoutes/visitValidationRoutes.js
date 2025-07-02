const express = require('express');
const visitValidationController = require('../../controllers/visitValidationController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
  adminAuthenticateToken,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

// Generate QR code token (admin only)
router.post(
  '/restaurants/:restaurantId/visit-token',
  appApiKeyAuth,
  adminAuthenticateToken,
  visitValidationController.generateVisitToken,
);

// Validate visit token (user)
router.post(
  '/validate-visit',
  appApiKeyAuth,
  appAuthenticateToken,
  visitValidationController.validateVisit,
);

// Get validation status for a restaurant (user)
router.get(
  '/restaurants/:restaurantId/validation-status',
  appApiKeyAuth,
  appAuthenticateToken,
  visitValidationController.getValidationStatus,
);

module.exports = router;
