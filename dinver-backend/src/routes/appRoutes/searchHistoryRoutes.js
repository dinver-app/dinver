const express = require('express');
const searchHistoryController = require('../../controllers/searchHistoryController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

router.post(
  '/search-history',
  appApiKeyAuth,
  appAuthenticateToken,
  searchHistoryController.addSearchHistory,
);

router.get(
  '/search-history',
  appApiKeyAuth,
  appAuthenticateToken,
  searchHistoryController.getSearchHistory,
);

module.exports = router;
