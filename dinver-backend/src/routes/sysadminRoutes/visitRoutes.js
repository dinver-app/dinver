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

module.exports = router;
