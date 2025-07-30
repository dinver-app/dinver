const express = require('express');
const restaurantController = require('../../controllers/restaurantController');
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

module.exports = router;
