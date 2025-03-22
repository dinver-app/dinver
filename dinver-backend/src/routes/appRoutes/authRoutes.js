const express = require('express');
const authController = require('../../controllers/authController');

const router = express.Router();

router.post('/auth/login', authController.login);

router.post('/auth/register', authController.register);

router.get('/auth/logout', authController.logout);

router.get('/auth/check-auth', authController.checkAuth);

router.post('/auth/social-login', authController.socialLogin);

module.exports = router;
