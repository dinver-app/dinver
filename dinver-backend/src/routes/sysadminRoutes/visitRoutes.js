const express = require('express');
const visitController = require('../../controllers/sysadminVisitController');
const {
  sysadminAuthenticateToken,
  checkSysadmin,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

// Visit statistics
router.get(
  '/visits/stats',
  sysadminAuthenticateToken,
  checkSysadmin,
  visitController.getVisitStats,
);

// Visit CRUD
router.get(
  '/visits',
  sysadminAuthenticateToken,
  checkSysadmin,
  visitController.getAllVisits,
);

router.get(
  '/visits/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  visitController.getVisitById,
);

router.delete(
  '/visits/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  visitController.deleteVisit,
);

// Visit approval/rejection
router.post(
  '/visits/:id/approve',
  sysadminAuthenticateToken,
  checkSysadmin,
  visitController.approveVisit,
);

router.post(
  '/visits/:id/reject',
  sysadminAuthenticateToken,
  checkSysadmin,
  visitController.rejectVisit,
);

// Receipt data updates (legacy - for editing fields)
router.put(
  '/receipts/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  visitController.updateReceipt,
);

// Receipt review endpoints (new - with AI learning)
router.get(
  '/receipts/pending',
  sysadminAuthenticateToken,
  checkSysadmin,
  visitController.getPendingReceipts,
);

router.post(
  '/receipts/:id/approve',
  sysadminAuthenticateToken,
  checkSysadmin,
  visitController.approveReceipt,
);

router.post(
  '/receipts/:id/reject',
  sysadminAuthenticateToken,
  checkSysadmin,
  visitController.rejectReceipt,
);

module.exports = router;
