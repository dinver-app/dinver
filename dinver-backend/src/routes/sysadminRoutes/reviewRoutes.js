const express = require('express');
const reviewController = require('../../controllers/reviewController');
const {
  checkSysadmin,
  sysadminAuthenticateToken,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

// Mark review as elite
router.put(
  '/reviews/:id/mark-elite',
  sysadminAuthenticateToken,
  checkSysadmin,
  reviewController.markReviewAsElite,
);

// Remove elite status from review
router.put(
  '/reviews/:id/remove-elite',
  sysadminAuthenticateToken,
  checkSysadmin,
  reviewController.removeEliteFromReview,
);

module.exports = router;
