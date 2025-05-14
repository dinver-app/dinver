const express = require('express');
const restaurantPostController = require('../../controllers/restaurantPostController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
  isRestaurantOwner,
} = require('../../middleware/roleMiddleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// Create post (restaurant owners only)
router.post(
  '/posts',
  appApiKeyAuth,
  appAuthenticateToken,
  upload.array('media', 10), // Max 10 files (1 video or multiple images)
  restaurantPostController.createPost,
);

// Get feed (public)
router.get('/feed', appApiKeyAuth, restaurantPostController.getFeed);

// Like/Unlike post (authenticated users)
router.post(
  '/posts/:postId/like',
  appApiKeyAuth,
  appAuthenticateToken,
  restaurantPostController.toggleLike,
);

// Delete post (restaurant owners only)
router.delete(
  '/posts/:postId',
  appApiKeyAuth,
  appAuthenticateToken,
  isRestaurantOwner,
  restaurantPostController.deletePost,
);

// Get all posts for a specific restaurant
router.get(
  '/posts',
  appApiKeyAuth,
  appAuthenticateToken,
  restaurantPostController.getPostsByRestaurant,
);

module.exports = router;
