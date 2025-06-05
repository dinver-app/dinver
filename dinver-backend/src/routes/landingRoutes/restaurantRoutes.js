const express = require('express');
const restaurantController = require('../../controllers/restaurantController');
const { landingApiKeyAuth } = require('../../middleware/roleMiddleware');

const router = express.Router();

router.get('/partners', landingApiKeyAuth, restaurantController.getPartners);

module.exports = router;
