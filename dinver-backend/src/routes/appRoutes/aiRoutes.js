const express = require('express');
const router = express.Router();
const aiController = require('../../controllers/aiController');
const {
  appAuthenticateToken,
  appApiKeyAuth,
} = require('../../middleware/roleMiddleware');

// POST /api/app/ai/chat - can be used without auth for public queries
router.post('/ai/chat', appApiKeyAuth, aiController.chat);

// GET last thread for user+restaurant (read-only) - requires auth
router.get('/ai/threads/:restaurantId', appApiKeyAuth, appAuthenticateToken, aiController.getThreadByRestaurant);

// DB-backed: list, detail, delete (requires auth)
router.get('/ai/db/threads', appApiKeyAuth, appAuthenticateToken, aiController.getThreads);

router.get('/ai/db/threads/:id', appApiKeyAuth, appAuthenticateToken, aiController.getThreadById);

router.delete('/ai/db/threads/:id', appApiKeyAuth, appAuthenticateToken, aiController.deleteThread);

module.exports = router;
