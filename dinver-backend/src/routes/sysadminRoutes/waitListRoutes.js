const express = require('express');
const waitListController = require('../../controllers/waitListController');
const {
  sysadminAuthenticateToken,
  checkSysadmin,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

router.get(
  '/waitlist/get-all',
  sysadminAuthenticateToken,
  checkSysadmin,
  waitListController.getAllWaitListEntries,
);

router.get(
  '/waitlist/get-stats',
  sysadminAuthenticateToken,
  checkSysadmin,
  waitListController.getWaitListStats,
);

module.exports = router;
