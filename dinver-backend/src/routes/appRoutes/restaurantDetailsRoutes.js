const express = require('express');
const menuController = require('../../controllers/menuController');
const drinksController = require('../../controllers/drinkController');

const { appApiKeyAuth } = require('../../middleware/roleMiddleware');

const router = express.Router();

// menu routes

router.get(
  '/restaurantDetails/menu/categories/:restaurantId',
  appApiKeyAuth,
  menuController.getCategoryItems,
);

router.get(
  '/restaurantDetails/menu/menuItems/:restaurantId',
  appApiKeyAuth,
  menuController.getMenuItems,
);

router.get(
  '/restaurantDetails/menu/allergens',
  appApiKeyAuth,
  menuController.getAllAllergens,
);

// drinks routes

router.get(
  '/restaurantDetails/drinks/categories/:restaurantId',
  appApiKeyAuth,
  drinksController.getDrinkCategories,
);

router.get(
  '/restaurantDetails/drinks/drinkItems/:restaurantId',
  appApiKeyAuth,
  drinksController.getDrinkItems,
);

module.exports = router;
