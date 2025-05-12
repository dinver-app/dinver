const express = require('express');
const trendingSearchesController = require('../../controllers/trendingSearchesController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

router.get(
  '/trending-searches',
  appApiKeyAuth,
  appAuthenticateToken,
  trendingSearchesController.getTrendingSearches,
);

module.exports = router;
