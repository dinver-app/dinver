const express = require('express');
const restaurantPostController = require('../../controllers/restaurantPostController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
  isRestaurantOwner,
  checkAdmin,
} = require('../../middleware/roleMiddleware');
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

const router = express.Router();

// Create post (restaurant owners only)
router.post(
  '/admin/posts',
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
  upload.array('media', 10),
  restaurantPostController.createPost,
);

// Delete post (restaurant owners only)
router.delete(
  '/admin/posts/:postId',
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
  isRestaurantOwner,
  restaurantPostController.deletePost,
);

// Get all posts for a specific restaurant
router.get(
  '/admin/posts',
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
  restaurantPostController.getPostsByRestaurant,
);

module.exports = router;
