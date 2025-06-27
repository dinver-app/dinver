const express = require('express');
const reviewController = require('../../controllers/reviewController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
} = require('../../middleware/roleMiddleware');
const upload = require('../../../utils/uploadMiddleware');

const router = express.Router();

// Dohvati recenzije korisnika
router.get(
  '/reviews',
  appApiKeyAuth,
  appAuthenticateToken,
  reviewController.getUserReviews,
);

// Dohvati recenzije restorana
router.get(
  '/restaurants/:restaurantId/reviews',
  appApiKeyAuth,
  reviewController.getRestaurantReviews,
);

// Kreiraj novu recenziju
router.post(
  '/reviews',
  appApiKeyAuth,
  appAuthenticateToken,
  upload.array('photos'),
  reviewController.createReview,
);

// Ažuriraj recenziju
router.patch(
  '/reviews/:id',
  appApiKeyAuth,
  appAuthenticateToken,
  upload.array('photos'),
  reviewController.updateReview,
);

// Note: Delete route removed to maintain review credibility
// Controller function kept for potential admin/moderation purposes

module.exports = router;
