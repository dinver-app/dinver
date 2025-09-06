const express = require('express');
const router = express.Router();
const {
  getAllSizes,
  createSize,
  updateSize,
  deleteSize,
} = require('../../controllers/sizeController');
const {
  adminAuthenticateToken,
  checkAdmin,
} = require('../../middleware/roleMiddleware');

// Get all sizes for a specific restaurant
router.get(
  '/sizes/:restaurantId',
  adminAuthenticateToken,
  checkAdmin,
  getAllSizes,
);

// Create a new size (admin only)
router.post('/sizes/', adminAuthenticateToken, checkAdmin, createSize);

// Update a size (admin only)
router.put('/sizes/:id', adminAuthenticateToken, checkAdmin, updateSize);

// Delete a size (admin only)
router.delete('/sizes/:id', adminAuthenticateToken, checkAdmin, deleteSize);

module.exports = router;
