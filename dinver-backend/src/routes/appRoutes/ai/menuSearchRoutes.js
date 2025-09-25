const router = require('express').Router();
const { appApiKeyAuth } = require('../../../middleware/roleMiddleware');
const {
  searchRestaurantMenuItems,
} = require('../../../ai/tools/menuSearchController');

router.post('/ai/search/menu', appApiKeyAuth, searchRestaurantMenuItems);

module.exports = router;
