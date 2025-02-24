const express = require('express');
const userController = require('../controllers/userController');
const { adminAuthenticateToken } = require('../middleware/roleMiddleware');

const router = express.Router();

router.put(
  '/users/language',
  adminAuthenticateToken,
  userController.updateUserLanguage,
);

router.get(
  '/users/language',
  adminAuthenticateToken,
  userController.getUserLanguage,
);

router.get('/users/:id', adminAuthenticateToken, userController.getUserById);

module.exports = router;
