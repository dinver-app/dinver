const express = require('express');
const router = express.Router();
const searchController = require('../../controllers/searchController');

// Route for global search
router.get('/global-search', searchController.globalSearch);

module.exports = router;
