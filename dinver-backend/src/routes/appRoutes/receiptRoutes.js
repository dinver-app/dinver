const express = require('express');
const receiptController = require('../../controllers/receiptController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

// NOTE: All receipt-related routes have been moved to Visit routes
// Visit + Receipt are created together in one atomic operation
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

// Delete user's own pending receipt
// User can only delete receipts with status 'pending' (not yet reviewed)
router.delete(
  '/receipts/:id',
  appApiKeyAuth,
  appAuthenticateToken,
  receiptController.deleteUserReceipt,
);

module.exports = router;
