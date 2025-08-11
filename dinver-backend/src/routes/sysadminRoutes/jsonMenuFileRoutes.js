const express = require('express');
const router = express.Router();
const {
  getRestaurantJsonFiles,
  createJsonMenuFile,
  updateJsonMenuFile,
  deleteJsonMenuFile,
  importMenuFromJsonFile
} = require('../../controllers/jsonMenuFileController');
const { authenticateToken, requireRole } = require('../../middleware/roleMiddleware');

// All routes require sysadmin role
router.use(authenticateToken);
router.use(requireRole(['sysadmin']));

// Get all JSON menu files for a restaurant
router.get('/restaurants/:restaurantId/json-files', getRestaurantJsonFiles);

// Create a new JSON menu file
router.post('/restaurants/:restaurantId/json-files', createJsonMenuFile);

// Update a JSON menu file
router.put('/json-files/:id', updateJsonMenuFile);

// Delete a JSON menu file (soft delete)
router.delete('/json-files/:id', deleteJsonMenuFile);

// Import menu from JSON file
router.post('/json-files/:id/import', importMenuFromJsonFile);

module.exports = router;
