const express = require('express');
const adminController = require('../../controllers/adminController');
const {
  adminAuthenticateToken,
  checkAdmin,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

router.get(
  '/admin-restaurants',
  adminAuthenticateToken,
  checkAdmin,
  adminController.getAdminRestaurants,
);

router.get(
  '/restaurants/:restaurantId/admins',
  adminAuthenticateToken,
  checkAdmin,
  adminController.getRestaurantAdmins,
);

router.post(
  '/restaurants/:restaurantId/admins',
  adminAuthenticateToken,
  checkAdmin,
  adminController.addRestaurantAdmin,
);

router.put(
  '/restaurants/:restaurantId/admins/:userId',
  adminAuthenticateToken,
  checkAdmin,
  adminController.updateRestaurantAdmin,
);

router.delete(
  '/restaurants/:restaurantId/admins/:userId',
  adminAuthenticateToken,
  checkAdmin,
  adminController.removeRestaurantAdmin,
);

router.get(
  '/role/:restaurantId',
  adminAuthenticateToken,
  checkAdmin,
  adminController.getUserRole,
);

module.exports = router;
