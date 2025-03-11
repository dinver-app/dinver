const express = require('express');
const restaurantController = require('../../controllers/restaurantController');
const { appAuthenticateToken } = require('../../middleware/roleMiddleware');

const router = express.Router();

router.get(
  '/restaurants',
  appAuthenticateToken,
  restaurantController.getRestaurants,
);

router.get(
  '/restaurants/all',
  appAuthenticateToken,
  restaurantController.getAllRestaurants,
);

module.exports = router;
