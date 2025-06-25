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

// Get statistics for a specific post
router.get(
  '/restaurants/:restaurantId/posts/:postId/stats',
  adminAuthenticateToken,
  checkAdmin,
  adminController.getPostStats,
);

// Get aggregated statistics for all posts of a restaurant
router.get(
  '/restaurants/:restaurantId/posts/stats',
  adminAuthenticateToken,
  checkAdmin,
  adminController.getRestaurantPostStats,
);

module.exports = router;
