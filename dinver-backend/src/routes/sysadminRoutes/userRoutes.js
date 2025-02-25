const express = require('express');
const userController = require('../../controllers/userController');
const {
  sysadminAuthenticateToken,
  checkSysadmin,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

router.put(
  '/users/language',
  sysadminAuthenticateToken,
  checkSysadmin,
  userController.updateUserLanguage,
);
router.get(
  '/users/language',
  sysadminAuthenticateToken,
  checkSysadmin,
  userController.getUserLanguage,
);
router.get(
  '/users/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  userController.getUserById,
);

module.exports = router;
