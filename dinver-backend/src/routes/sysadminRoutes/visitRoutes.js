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

// NOTE: Visit approval/rejection is handled through Receipts
// When a receipt is rejected, the associated visit is automatically rejected
// When a receipt is approved, the visit becomes visible to the user

module.exports = router;
