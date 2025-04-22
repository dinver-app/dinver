const express = require('express');
const reviewController = require('../../controllers/reviewController');
const restaurantController = require('../../controllers/restaurantController');
const {
  checkAdmin,
  adminAuthenticateToken,
} = require('../../middleware/roleMiddleware');
const upload = require('../../../utils/uploadMiddleware');

const router = express.Router();

router.get(
  '/restaurants/:slug',
  adminAuthenticateToken,
  checkAdmin,
  restaurantController.getRestaurantDetails,
);

router.get(
  '/restaurants/:id',
  adminAuthenticateToken,
  checkAdmin,
  restaurantController.getRestaurantById,
);

router.put(
  '/restaurants/details/:id',
  upload.single('thumbnail'),
  adminAuthenticateToken,
  checkAdmin,
  restaurantController.updateRestaurant,
);

router.put(
  '/restaurants/:id/working-hours',
  adminAuthenticateToken,
  checkAdmin,
  restaurantController.updateWorkingHours,
);

router.put(
  '/restaurants/:id/filters',
  adminAuthenticateToken,
  checkAdmin,
  restaurantController.updateFilters,
);

router.post(
  '/restaurants/:id/images',
  adminAuthenticateToken,
  checkAdmin,
  upload.array('images'),
  restaurantController.addRestaurantImages,
);

router.delete(
  '/restaurants/:id/images',
  adminAuthenticateToken,
  checkAdmin,
  restaurantController.deleteRestaurantImage,
);

router.put(
  '/restaurants/:id/images/order',
  adminAuthenticateToken,
  checkAdmin,
  restaurantController.updateImageOrder,
);

router.get(
  '/restaurants/:restaurantId/reviews',
  adminAuthenticateToken,
  checkAdmin,
  reviewController.getRestaurantReviews,
);

router.get(
  '/restaurants/:id/custom-working-days',
  adminAuthenticateToken,
  checkAdmin,
  restaurantController.getCustomWorkingDays,
);

router.get(
  '/restaurants/:id/upcoming-custom-working-days',
  adminAuthenticateToken,
  checkAdmin,
  restaurantController.getUpcomingCustomWorkingDays,
);

router.post(
  '/restaurants/:id/custom-working-days',
  adminAuthenticateToken,
  checkAdmin,
  restaurantController.addCustomWorkingDay,
);

router.put(
  '/restaurants/:id/custom-working-days',
  adminAuthenticateToken,
  checkAdmin,
  restaurantController.updateCustomWorkingDay,
);

router.delete(
  '/restaurants/:id/custom-working-days',
  adminAuthenticateToken,
  checkAdmin,
  restaurantController.deleteCustomWorkingDay,
);

module.exports = router;
