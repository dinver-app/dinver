const express = require('express');
const googleAuthController = require('../../controllers/googleAuthController');
const { appApiKeyAuth } = require('../../middleware/roleMiddleware');

const router = express.Router();

router.post(
  '/auth/google',
  appApiKeyAuth,
  googleAuthController.googleSignIn,
);

module.exports = router;
