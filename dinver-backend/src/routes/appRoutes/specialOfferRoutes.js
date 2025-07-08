const express = require('express');
const specialOfferController = require('../../controllers/specialOfferController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
  restaurantOwnerAuth,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

// Public routes for customers
router.get(
  '/special-offers',
  appApiKeyAuth,
  appAuthenticateToken,
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
  '/admin/restaurants/:restaurantId/points-distribution',
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
  restaurantOwnerAuth,
  specialOfferController.redeemSpecialOffer,
);

module.exports = router;
