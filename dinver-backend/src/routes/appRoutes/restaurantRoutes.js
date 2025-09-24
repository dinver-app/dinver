const express = require('express');
const restaurantController = require('../../controllers/restaurantController');
const {
  appApiKeyAuth,
  appOptionalAuth,
} = require('../../middleware/roleMiddleware');
const {
  restaurantIdentifierMiddleware,
} = require('../../middleware/restaurantIdentifierMiddleware');

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

router.get(
  '/restaurants/new',
  // appApiKeyAuth,
  restaurantController.getNewRestaurants,
);

router.get(
  '/restaurants/all-new',
  // appApiKeyAuth,
  restaurantController.getAllNewRestaurants,
);

router.get(
  '/restaurants/near-you',
  appApiKeyAuth,
  restaurantController.nearYou,
);

// New map endpoint for lean GeoJSON
router.get(
  '/restaurants/map',
  appApiKeyAuth,
  appOptionalAuth,
  restaurantController.getRestaurantsMap,
);

// New endpoints for fetching detailed data by IDs
router.post(
  '/restaurants/by-ids',
  appApiKeyAuth,
  restaurantController.getRestaurantsByIdsPost,
);

router.get(
  '/details/:restaurantId',
  appApiKeyAuth,
  restaurantIdentifierMiddleware,
  restaurantController.getFullRestaurantDetails,
);

router.get('/menu/:id', appApiKeyAuth, restaurantController.getRestaurantMenu);

router.get(
  '/restaurants/cities',
  appApiKeyAuth,
  restaurantController.getRestaurantCities,
);

module.exports = router;
