const express = require('express');
const authController = require('../../controllers/authController');
const sysadminController = require('../../controllers/sysadminController');

const router = express.Router();

router.post('/auth/login', sysadminController.sysadminLogin);

router.get('/auth/logout', authController.logout);

router.get('/auth/check-auth', authController.sysadminCheckAuth);

module.exports = router;
