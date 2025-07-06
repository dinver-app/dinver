const express = require('express');
const visitValidationController = require('../../controllers/visitValidationController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

// ===== ADMIN RUTES =====
// Generate QR code token for restaurant
router.post(
  '/restaurants/:restaurantId/qr-token',
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
  visitValidationController.generateVisitToken,
);

// Close QR code
router.post(
  '/qr-token/:token/close',
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
  visitValidationController.closeQRCode,
);

// ===== USER RUTES =====
// Validate visit token (scan QR code)
router.post(
  '/qr-token/validate',
  appApiKeyAuth,
  appAuthenticateToken,
  visitValidationController.validateVisit,
);

// Get validation status for restaurant (can leave review)
router.get(
  '/restaurants/:restaurantId/validation-status',
  appApiKeyAuth,
  appAuthenticateToken,
  visitValidationController.getValidationStatus,
);

module.exports = router;
