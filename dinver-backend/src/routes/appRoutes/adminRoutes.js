const express = require('express');
const restaurantController = require('../../controllers/restaurantController');
const typeController = require('../../controllers/typeController');

const {
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
} = require('../../middleware/roleMiddleware');
const upload = require('../../../utils/uploadMiddleware');

const router = express.Router();

// General routes
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

// Filters routes

router.get(
  '/admin/types/food-types',
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
  typeController.getAllFoodTypes,
);

router.get(
  '/admin/types/establishment-types',
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
  typeController.getAllEstablishmentTypes,
);

router.get(
  '/admin/types/establishment-perks',
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
  typeController.getAllEstablishmentPerks,
);

router.get(
  '/admin/types/meal-types',
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
  typeController.getAllMealTypes,
);

router.get(
  '/admin/types/price-categories',
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
  typeController.getAllPriceCategories,
);

router.get(
  '/admin/types/dietary-types',
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
  typeController.getAllDietaryTypes,
);

router.put(
  '/admin/restaurants/:id/filters',
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
  restaurantController.updateFilters,
);

// Working hours routes

router.put(
  '/admin/restaurants/:id/working-hours',
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
  restaurantController.updateWorkingHours,
);

router.get(
  '/admin/restaurants/:id/custom-working-days',
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
  restaurantController.getCustomWorkingDays,
);

router.get(
  '/admin/restaurants/:id/upcoming-custom-working-days',
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
  restaurantController.getUpcomingCustomWorkingDays,
);

router.post(
  '/admin/restaurants/:id/custom-working-days',
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
  restaurantController.addCustomWorkingDay,
);

router.put(
  '/admin/restaurants/:id/custom-working-days',
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
  restaurantController.updateCustomWorkingDay,
);

router.delete(
  '/admin/restaurants/:id/custom-working-days',
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
  restaurantController.deleteCustomWorkingDay,
);

// images routes

router.post(
  '/admin/restaurants/:id/images',
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
  upload.array('images'),
  restaurantController.addRestaurantImages,
);

router.delete(
  '/admin/restaurants/:id/images',
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
  restaurantController.deleteRestaurantImage,
);

router.put(
  '/admin/restaurants/:id/images/order',
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
  restaurantController.updateImageOrder,
);

module.exports = router;
