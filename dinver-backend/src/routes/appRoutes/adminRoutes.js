const express = require('express');
const restaurantController = require('../../controllers/restaurantController');

const {
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
} = require('../../middleware/roleMiddleware');
const upload = require('../../../utils/uploadMiddleware');

const router = express.Router();

// Admin rute
router.get(
  '/admin/restaurants/:slug',
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
  restaurantController.getRestaurantDetails,
);

router.put(
  '/admin/restaurants/details/:id',
  upload.single('thumbnail'),
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
  restaurantController.updateRestaurant,
);

router.delete(
  '/admin/restaurants/:id/images',
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
  restaurantController.deleteRestaurantImage,
);

router.delete(
  '/admin/restaurants/:id/thumbnail',
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
  restaurantController.deleteRestaurantThumbnail,
);

module.exports = router;
