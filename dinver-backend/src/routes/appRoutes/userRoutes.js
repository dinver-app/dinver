const express = require('express');
const userController = require('../../controllers/userController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

router.get(
  '/user/stats',
  appApiKeyAuth,
  appAuthenticateToken,
  userController.getStats,
);

module.exports = router;
