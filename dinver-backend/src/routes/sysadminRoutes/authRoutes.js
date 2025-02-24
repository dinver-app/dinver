const express = require('express');
const authController = require('../../controllers/authController');
const sysadminController = require('../../controllers/sysadminController');
const { checkSysadmin } = require('../../middleware/roleMiddleware');

const router = express.Router();

router.post(
  '/auth/login',
  sysadminController.sysadminLogin,
  checkSysadmin,
  (req, res) => {
    res.json({ accessToken: res.locals.accessToken });
  },
);

router.get('/auth/logout', authController.logout);

router.get('/auth/check-auth', authController.checkAuth);

module.exports = router;
