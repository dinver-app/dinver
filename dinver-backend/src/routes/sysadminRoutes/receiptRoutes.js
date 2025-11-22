const express = require('express');
const {
  sysadminAuthenticateToken,
  checkSysadmin,
} = require('../../middleware/roleMiddleware');
const {
  getAllReceipts,
  getReceiptById,
  updateReceiptData,
  approveReceipt,
  rejectReceipt,
  deleteReceipt,
  checkReservations,
  getOcrAnalytics,
  getTrainingData,
  markAsUsedForTraining,
  getReceiptAnalytics,
} = require('../../controllers/receiptController');

const router = express.Router();

// Sysadmin routes
router.get(
  '/receipts',
  sysadminAuthenticateToken,
  checkSysadmin,
  getAllReceipts,
);
router.get(
  '/receipts/check-reservations',
  sysadminAuthenticateToken,
  checkSysadmin,
  checkReservations,
);
router.get(
  '/receipts/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  getReceiptById,
);
router.put(
  '/receipts/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  updateReceiptData,
);
router.post(
  '/receipts/:id/approve',
  sysadminAuthenticateToken,
  checkSysadmin,
  approveReceipt,
);
router.post(
  '/receipts/:id/reject',
  sysadminAuthenticateToken,
  checkSysadmin,
  rejectReceipt,
);
router.delete(
  '/receipts/:id/delete',
  sysadminAuthenticateToken,
  checkSysadmin,
  deleteReceipt,
);

// OCR Analytics & Training routes
router.get(
  '/ocr-analytics',
  sysadminAuthenticateToken,
  checkSysadmin,
  getOcrAnalytics,
);
router.get(
  '/training-data',
  sysadminAuthenticateToken,
  checkSysadmin,
  getTrainingData,
);
router.post(
  '/training-data/mark-used',
  sysadminAuthenticateToken,
  checkSysadmin,
  markAsUsedForTraining,
);

// Receipt Analytics (Business Insights) routes
router.get(
  '/receipt-analytics',
  sysadminAuthenticateToken,
  checkSysadmin,
  getReceiptAnalytics,
);

module.exports = router;
