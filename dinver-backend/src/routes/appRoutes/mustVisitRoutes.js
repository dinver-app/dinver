const express = require('express');
const mustVisitController = require('../../controllers/mustVisitController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
  appOptionalAuth,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

// Get user's Must Visit list
router.get(
  '/must-visit',
  appApiKeyAuth,
  appAuthenticateToken,
  mustVisitController.getMustVisitList,
);

// Add restaurant to Must Visit list
router.post(
  '/must-visit',
  appApiKeyAuth,
  appAuthenticateToken,
  mustVisitController.addToMustVisit,
);

// Remove restaurant from Must Visit list
router.delete(
  '/must-visit/:restaurantId',
  appApiKeyAuth,
  appAuthenticateToken,
  mustVisitController.removeFromMustVisit,
);

// Check if restaurant is in Must Visit list
router.get(
  '/must-visit/:restaurantId/check',
  appApiKeyAuth,
  appAuthenticateToken,
  mustVisitController.checkIsMustVisit,
);

// Get other user's Must Visit list (public viewing with optional auth)
router.get(
  '/users/:userId/must-visit',
  appApiKeyAuth,
  appOptionalAuth,
  mustVisitController.getUserMustVisitList,
);

// Get other user's Visited list (public viewing with optional auth)
router.get(
  '/users/:userId/visited',
  appApiKeyAuth,
  appOptionalAuth,
  mustVisitController.getUserVisitedList,
);

module.exports = router;
