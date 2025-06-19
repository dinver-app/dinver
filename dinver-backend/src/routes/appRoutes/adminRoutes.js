const express = require('express');
const restaurantController = require('../../controllers/restaurantController');
const typeController = require('../../controllers/typeController');
const menuController = require('../../controllers/menuController');

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

// menu routes

router.get(
  '/admin/menu/categories/:restaurantId',
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
  menuController.getCategoryItems,
);

router.post(
  '/admin/menu/categories',
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
  menuController.createCategory,
);

router.put(
  '/admin/menu/categories/:id',
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
  menuController.updateCategory,
);

router.delete(
  '/admin/menu/categories/:id',
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
  menuController.deleteCategory,
);

router.get(
  '/admin/menu/menuItems/:restaurantId',
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
  menuController.getMenuItems,
);

router.post(
  '/admin/menu/menuItems',
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
  upload.single('imageFile'),
  menuController.createMenuItem,
);

router.put(
  '/admin/menu/menuItems/:id',
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
  upload.single('imageFile'),
  menuController.updateMenuItem,
);

router.delete(
  '/admin/menu/menuItems/:id',
  appAuthenticateToken,
  checkAdmin,
  menuController.deleteMenuItem,
);

router.get(
  '/admin/menu/allergens',
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
  menuController.getAllAllergens,
);

router.put(
  '/admin/menu/categories-order',
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
  menuController.updateCategoryOrder,
);

router.put(
  '/admin/menu/menuItems-order',
  appAuthenticateToken,
  appApiKeyAuth,
  checkAdmin,
  menuController.updateItemOrder,
);

module.exports = router;
