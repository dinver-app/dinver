const express = require('express');
const router = express.Router();
const foodCategoryController = require('../../controllers/foodCategoryController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
} = require('../../middleware/roleMiddleware');

// Route to get popular food categories
router.get(
  '/popular-categories',
  appApiKeyAuth,
  foodCategoryController.getPopularCategories,
);

// Route to record a click on a food category
router.post(
  '/record-category-click',
  appApiKeyAuth,
  appAuthenticateToken,
  foodCategoryController.recordCategoryClick,
);

module.exports = router;
