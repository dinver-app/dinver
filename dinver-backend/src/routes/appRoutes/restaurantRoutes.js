const express = require('express');
const restaurantController = require('../../controllers/restaurantController');
const { appApiKeyAuth } = require('../../middleware/roleMiddleware');

const router = express.Router();

router.get('/restaurants', appApiKeyAuth, restaurantController.getRestaurants);

router.get(
  '/restaurants/all',
  appApiKeyAuth,
  restaurantController.getAllRestaurants,
);

router.get(
  '/restaurants/all-with-details',
  appApiKeyAuth,
  restaurantController.getAllRestaurantsWithDetails,
);

router.get(
  '/restaurants/sample',
  // appApiKeyAuth,
  restaurantController.getSampleRestaurants,
);

module.exports = router;
