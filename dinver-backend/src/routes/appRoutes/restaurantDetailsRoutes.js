const express = require('express');
const menuController = require('../../controllers/menuController');
const drinksController = require('../../controllers/drinkController');

const { appApiKeyAuth } = require('../../middleware/roleMiddleware');
const {
  restaurantIdentifierMiddleware,
} = require('../../middleware/restaurantIdentifierMiddleware');

const router = express.Router();

// menu routes

router.get(
  '/restaurantDetails/menu/categories/:restaurantId',
  appApiKeyAuth,
  restaurantIdentifierMiddleware,
  menuController.getCategoryItems,
);

router.get(
  '/restaurantDetails/menu/menuItems/:restaurantId',
  appApiKeyAuth,
  restaurantIdentifierMiddleware,
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
  restaurantIdentifierMiddleware,
  drinksController.getDrinkCategories,
);

router.get(
  '/restaurantDetails/drinks/drinkItems/:restaurantId',
  appApiKeyAuth,
  restaurantIdentifierMiddleware,
  drinksController.getDrinkItems,
);

module.exports = router;
