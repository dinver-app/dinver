const express = require('express');
const receiptController = require('../../controllers/receiptController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

// NOTE: Receipt upload has been moved to Visit routes
// The new V2 flow creates Visit + Receipt together in one atomic operation
// See: /api/app/visits/upload-receipt

// Get user's receipts (all statuses - pending, approved, rejected)
// This is for the "My Receipts" list where user sees all their uploaded receipts
// Optional query param: status=pending|approved|rejected
router.get(
  '/receipts',
  appApiKeyAuth,
  appAuthenticateToken,
  receiptController.getUserReceipts,
);

module.exports = router;
