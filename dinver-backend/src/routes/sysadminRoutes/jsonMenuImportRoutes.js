const express = require('express');
const {
  importMenuFromJson,
  listAvailableMenus,
} = require('../../controllers/jsonMenuImportController');
const {
  checkSysadmin,
  sysadminAuthenticateToken,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

// List available menu folders
router.get(
  '/list',
  sysadminAuthenticateToken,
  checkSysadmin,
  listAvailableMenus,
);

// Import menu from JSON files for a specific restaurant
router.post(
  '/:restaurantSlug/import',
  sysadminAuthenticateToken,
  checkSysadmin,
  importMenuFromJson,
);

module.exports = router;
