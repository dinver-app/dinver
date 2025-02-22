const express = require('express');
const adminController = require('../controllers/adminController');
const {
  authenticateToken,
  checkAdmin,
} = require('../middleware/roleMiddleware');

const router = express.Router();

router.post('/login', adminController.adminLogin);

router.get(
  '/admin-restaurants',
  authenticateToken,
  checkAdmin,
  adminController.getAdminRestaurants,
);

router.get(
  '/restaurants/:restaurantId/admins',
  authenticateToken,
  checkAdmin,
  adminController.getRestaurantAdmins,
);

router.post(
  '/restaurants/:restaurantId/admins',
  authenticateToken,
  checkAdmin,
  adminController.addRestaurantAdmin,
);

router.put(
  '/restaurants/:restaurantId/admins/:userId',
  authenticateToken,
  checkAdmin,
  adminController.updateRestaurantAdmin,
);

router.delete(
  '/restaurants/:restaurantId/admins/:userId',
  authenticateToken,
  checkAdmin,
  adminController.removeRestaurantAdmin,
);

router.get(
  '/role/:restaurantId',
  authenticateToken,
  checkAdmin,
  adminController.getUserRole,
);

module.exports = router;
