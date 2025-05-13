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

router.get(
  '/popular-restaurants',
  appApiKeyAuth,
  appAuthenticateToken,
  restaurantClickController.getPopularRestaurants,
);

router.post(
  '/restaurant-promo-click',
  appApiKeyAuth,
  appAuthenticateToken,
  restaurantClickController.addRestaurantPromoClick,
);

module.exports = router;
