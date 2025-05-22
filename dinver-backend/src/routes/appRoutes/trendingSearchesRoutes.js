const express = require('express');
const trendingSearchesController = require('../../controllers/trendingSearchesController');
const { appApiKeyAuth } = require('../../middleware/roleMiddleware');

const router = express.Router();

router.get(
  '/trending-searches',
  appApiKeyAuth,
  trendingSearchesController.getTrendingSearches,
);

module.exports = router;
