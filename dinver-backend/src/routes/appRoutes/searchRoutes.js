const express = require('express');
const router = express.Router();
const searchController = require('../../controllers/searchController');
const { appApiKeyAuth } = require('../../middleware/roleMiddleware');

// Route for global search
router.get('/global-search', appApiKeyAuth, searchController.globalSearch);

module.exports = router;
