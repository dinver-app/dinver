const express = require('express');
const {
  createBackup,
  restoreBackup,
  listBackups,
  downloadBackup,
} = require('../../controllers/backupController');
const {
  sysadminAuthenticateToken,
  checkSysadmin,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

router.post(
  '/backup/:restaurantId',
  sysadminAuthenticateToken,
  checkSysadmin,
  createBackup,
);

router.post(
  '/restore/:restaurantId/:backupDate',
  sysadminAuthenticateToken,
  checkSysadmin,
  restoreBackup,
);

router.get('/backups', sysadminAuthenticateToken, checkSysadmin, listBackups);

router.get(
  '/download/:restaurantId/:backupDate',
  sysadminAuthenticateToken,
  checkSysadmin,
  downloadBackup,
);

module.exports = router;
