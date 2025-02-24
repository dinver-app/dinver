const express = require('express');
const authController = require('../../controllers/authController');
const adminController = require('../../controllers/adminController');

const router = express.Router();

router.post('/auth/login', adminController.adminLogin);

router.get('/auth/logout', authController.logout);

router.get('/auth/check-auth', authController.checkAuth);

module.exports = router;
