const express = require('express');
const specialOfferController = require('../../controllers/specialOfferController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

// Public routes for customers
router.get(
  '/special-offers',
  appApiKeyAuth,
  specialOfferController.getActiveSpecialOffers,
);

// Admin routes for restaurant owners
router.get(
  '/admin/special-offers/:restaurantId',
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
  specialOfferController.getSpecialOffersByRestaurant,
);

router.post(
  '/admin/special-offers',
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
  specialOfferController.createSpecialOffer,
);

router.put(
  '/admin/special-offers/:id',
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
  specialOfferController.updateSpecialOffer,
);

router.delete(
  '/admin/special-offers/:id',
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
  specialOfferController.deleteSpecialOffer,
);

router.put(
  '/admin/special-offers-order',
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
  specialOfferController.updateSpecialOfferOrder,
);

// Points distribution for admin to decide pricing
router.get(
  '/admin/points-distribution',
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
  specialOfferController.getPointsDistribution,
);

// QR code redemption (for restaurant staff)
router.post(
  '/admin/special-offers/redeem',
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
  specialOfferController.redeemSpecialOffer,
);

// Generate QR code for special offer (admin only)
router.get(
  '/admin/special-offers/:specialOfferId/qr',
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
  specialOfferController.generateSpecialOfferQR,
);

// Get redemption details for special offer (for customer preview)
router.get(
  '/special-offers/:specialOfferId/redemption-details',
  appApiKeyAuth,
  appAuthenticateToken,
  specialOfferController.getRedemptionDetails,
);

module.exports = router;
