const express = require('express');
const mustVisitController = require('../../controllers/mustVisitController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
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

module.exports = router;
