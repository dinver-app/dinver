const express = require('express');
const {
  createBackup,
  restoreBackup,
  listBackups,
  downloadBackup,
} = require('../controllers/backupController');
const {
  authenticateToken,
  checkSysadmin,
} = require('../middleware/roleMiddleware');

const router = express.Router();

router.post(
  '/backup/:restaurantId',
  authenticateToken,
  checkSysadmin,
  createBackup,
);

router.post(
  '/restore/:restaurantId/:backupDate',
  authenticateToken,
  checkSysadmin,
  restoreBackup,
);

router.get('/backups', authenticateToken, checkSysadmin, listBackups);

router.get(
  '/download/:restaurantId/:backupDate',
  authenticateToken,
  checkSysadmin,
  downloadBackup,
);

module.exports = router;
