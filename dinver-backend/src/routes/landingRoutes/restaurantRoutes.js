const express = require('express');
const restaurantController = require('../../controllers/restaurantController');
const menuController = require('../../controllers/menuController');
const drinksController = require('../../controllers/drinkController');
const { landingApiKeyAuth } = require('../../middleware/roleMiddleware');

const router = express.Router();

router.get('/partners', landingApiKeyAuth, restaurantController.getPartners);
router.get(
  '/details/:id',
  landingApiKeyAuth,
  restaurantController.getFullRestaurantDetails,
);
router.get(
  '/menu/:id',
  landingApiKeyAuth,
  restaurantController.getRestaurantMenu,
);
router.get(
  '/subdomain/:subdomain',
  landingApiKeyAuth,
  restaurantController.getRestaurantBySubdomain,
);
router.get(
  '/claim-filters',
  landingApiKeyAuth,
  restaurantController.getClaimFilters,
);
router.get(
  '/claim-restaurant/:id',
  landingApiKeyAuth,
  restaurantController.getClaimRestaurantInfo,
);
router.get(
  '/claim-restaurant/:id/working-hours',
  landingApiKeyAuth,
  restaurantController.getClaimRestaurantWorkingHours,
);
router.post(
  '/submit-claim',
  landingApiKeyAuth,
  restaurantController.submitClaimForm,
);

// menu routes

router.get(
  '/restaurantDetails/menu/categories/:restaurantId',
  landingApiKeyAuth,
  menuController.getCategoryItems,
);

router.get(
  '/restaurantDetails/menu/menuItems/:restaurantId',
  landingApiKeyAuth,
  menuController.getMenuItems,
);

router.get(
  '/restaurantDetails/menu/allergens',
  landingApiKeyAuth,
  menuController.getAllAllergens,
);

// drinks routes

router.get(
  '/restaurantDetails/drinks/categories/:restaurantId',
  landingApiKeyAuth,
  drinksController.getDrinkCategories,
);

router.get(
  '/restaurantDetails/drinks/drinkItems/:restaurantId',
  landingApiKeyAuth,
  drinksController.getDrinkItems,
);
module.exports = router;
