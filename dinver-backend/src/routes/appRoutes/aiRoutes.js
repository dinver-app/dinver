const express = require('express');
const router = express.Router();
const aiController = require('../../controllers/aiController');

// POST /api/app/ai/chat
router.post('/ai/chat', aiController.chat);

// POST /api/app/ai/restaurants/:restaurantId/chat
// Focused chat scoped to a single restaurant profile page
router.post(
  '/ai/restaurants/:restaurantId/chat',
  aiController.chatForRestaurant,
);

module.exports = router;
