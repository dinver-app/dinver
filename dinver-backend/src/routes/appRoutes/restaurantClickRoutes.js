const express = require('express');
const restaurantClickController = require('../../controllers/restaurantClickController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

router.post(
  '/restaurant-click',
  appApiKeyAuth,
  appAuthenticateToken,
  restaurantClickController.addRestaurantClick,
);

router.post(
  '/restaurant-promo-click',
  appApiKeyAuth,
  appAuthenticateToken,
  restaurantClickController.addRestaurantPromoClick,
);

router.get(
  '/popular-restaurants',
  // appApiKeyAuth,
  restaurantClickController.getPopularRestaurants,
);

module.exports = router;
