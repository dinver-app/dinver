const express = require('express');
const userSettingsController = require('../../controllers/userSettingsController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

router.get(
  '/user/settings',
  appApiKeyAuth,
  appAuthenticateToken,
  userSettingsController.getUserSettings,
);

router.patch(
  '/user/settings',
  appApiKeyAuth,
  appAuthenticateToken,
  userSettingsController.updateUserSettings,
);

router.post(
  '/user/recent-address',
  appApiKeyAuth,
  appAuthenticateToken,
  userSettingsController.addRecentAddress,
);

router.get(
  '/user/recent-addresses',
  appApiKeyAuth,
  appAuthenticateToken,
  userSettingsController.getRecentAddresses,
);

module.exports = router;
