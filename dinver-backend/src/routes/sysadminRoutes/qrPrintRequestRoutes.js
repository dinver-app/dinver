const express = require('express');
const {
  getAllQRPrintRequests,
  updateQRPrintRequestStatus,
  deleteQRPrintRequest,
} = require('../../controllers/qrPrintRequestController');
const {
  sysadminAuthenticateToken,
  checkSysadmin,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

router.get(
  '/qr-print-requests',
  sysadminAuthenticateToken,
  checkSysadmin,
  getAllQRPrintRequests,
);

router.patch(
  '/qr-print-requests/:id/status',
  sysadminAuthenticateToken,
  checkSysadmin,
  updateQRPrintRequestStatus,
);

router.delete(
  '/qr-print-requests/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  deleteQRPrintRequest,
);

module.exports = router;
