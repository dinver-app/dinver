const express = require('express');
const router = express.Router();
const {
  getAllSizes,
  createSize,
  updateSize,
  deleteSize,
} = require('../../controllers/sizeController');
const {
  sysadminAuthenticateToken,
  checkSysadmin,
} = require('../../middleware/roleMiddleware');

// Get all sizes for a specific restaurant
router.get(
  '/sizes/:restaurantId',
  sysadminAuthenticateToken,
  checkSysadmin,
  getAllSizes,
);

// Create a new size (admin only)
router.post('/sizes/', sysadminAuthenticateToken, checkSysadmin, createSize);

// Update a size (admin only)
router.put('/sizes/:id', sysadminAuthenticateToken, checkSysadmin, updateSize);

// Delete a size (admin only)
router.delete(
  '/sizes/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  deleteSize,
);

module.exports = router;
