const express = require('express');
const adminController = require('../controllers/adminController');

const { authenticateToken } = require('../middleware/roleMiddleware');

const router = express.Router();

router.get(
  '/admin-restaurants',
  authenticateToken,
  adminController.getAdminRestaurants,
);

router.post('/login', adminController.adminLogin);

module.exports = router;
