const express = require('express');
const reviewController = require('../../controllers/reviewController');
const restaurantController = require('../../controllers/restaurantController');
const {
  sysadminAuthenticateToken,
  checkSysadmin,
} = require('../../middleware/roleMiddleware');
const {
  searchRestaurants,
  nearbyRestaurants,
} = require('../../controllers/restaurantSearchController');
const upload = require('../../../utils/uploadMiddleware');

const router = express.Router();

router.get(
  '/restaurants/list',
  sysadminAuthenticateToken,
  checkSysadmin,
  restaurantController.getRestaurantsList,
);

router.get(
  '/restaurants',
  sysadminAuthenticateToken,
  checkSysadmin,
  restaurantController.getRestaurants,
);

router.get(
  '/restaurants/all',
  sysadminAuthenticateToken,
  checkSysadmin,
  restaurantController.getAllRestaurants,
);

// Sysadmin lightweight search (name/address/place/oib)
router.get(
  '/restaurants/search',
  sysadminAuthenticateToken,
  checkSysadmin,
  searchRestaurants,
);

// Sysadmin nearby using Haversine
router.get(
  '/restaurants/nearby',
  sysadminAuthenticateToken,
  checkSysadmin,
  nearbyRestaurants,
);

// Google Places Import Routes (must come before :slug route)
router.post(
  '/restaurants/import-from-url',
  sysadminAuthenticateToken,
  checkSysadmin,
  restaurantController.importRestaurantFromUrl,
);

router.get(
  '/restaurants/search-places',
  sysadminAuthenticateToken,
  checkSysadmin,
  restaurantController.searchGooglePlaces,
);

router.get(
  '/restaurants/place-details/:placeId',
  sysadminAuthenticateToken,
  checkSysadmin,
  restaurantController.getGooglePlaceDetails,
);

router.post(
  '/restaurants/create-from-google',
  sysadminAuthenticateToken,
  checkSysadmin,
  restaurantController.createRestaurantFromGoogle,
);

router.get('/restaurants/:slug', restaurantController.getRestaurantDetails);

router.put(
  '/restaurants/details/:id',
  upload.single('thumbnail'),
  sysadminAuthenticateToken,
  checkSysadmin,
  restaurantController.updateRestaurant,
);

router.put(
  '/restaurants/:id/working-hours',
  sysadminAuthenticateToken,
  checkSysadmin,
  restaurantController.updateWorkingHours,
);

router.post(
  '/restaurants',
  sysadminAuthenticateToken,
  checkSysadmin,
  restaurantController.addRestaurant,
);

router.put(
  '/restaurants/:id/filters',
  sysadminAuthenticateToken,
  checkSysadmin,
  restaurantController.updateFilters,
);

router.post(
  '/restaurants/:id/images',
  sysadminAuthenticateToken,
  checkSysadmin,
  upload.array('images'),
  restaurantController.addRestaurantImages,
);

router.delete(
  '/restaurants/:id/images',
  sysadminAuthenticateToken,
  checkSysadmin,
  restaurantController.deleteRestaurantImage,
);

router.delete(
  '/restaurants/:id/thumbnail',
  sysadminAuthenticateToken,
  checkSysadmin,
  restaurantController.deleteRestaurantThumbnail,
);

router.put(
  '/restaurants/:id/images/order',
  sysadminAuthenticateToken,
  checkSysadmin,
  restaurantController.updateImageOrder,
);

router.get(
  '/restaurants/details/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  restaurantController.getRestaurantById,
);

router.delete(
  '/restaurants/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  restaurantController.deleteRestaurant,
);

router.post(
  '/restaurants/:restaurantId/reviews',
  sysadminAuthenticateToken,
  upload.array('images'),
  reviewController.createReview,
);

router.get(
  '/restaurants/:restaurantId/reviews',
  sysadminAuthenticateToken,
  checkSysadmin,
  reviewController.getRestaurantReviews,
);

router.get(
  '/restaurants/:id/custom-working-days',
  sysadminAuthenticateToken,
  checkSysadmin,
  restaurantController.getCustomWorkingDays,
);

router.get(
  '/restaurants/:id/upcoming-custom-working-days',
  sysadminAuthenticateToken,
  checkSysadmin,
  restaurantController.getUpcomingCustomWorkingDays,
);

router.post(
  '/restaurants/:id/custom-working-days',
  sysadminAuthenticateToken,
  checkSysadmin,
  restaurantController.addCustomWorkingDay,
);

router.put(
  '/restaurants/:id/custom-working-days',
  sysadminAuthenticateToken,
  checkSysadmin,
  restaurantController.updateCustomWorkingDay,
);

router.delete(
  '/restaurants/:id/custom-working-days',
  sysadminAuthenticateToken,
  checkSysadmin,
  restaurantController.deleteCustomWorkingDay,
);

module.exports = router;
