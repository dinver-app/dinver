const express = require('express');
const couponController = require('../../controllers/couponController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

// Public routes for customers
router.get('/coupons', appApiKeyAuth, couponController.getAvailableCoupons);

router.post(
  '/coupons/claim',
  appApiKeyAuth,
  appAuthenticateToken,
  couponController.claimCoupon,
);

router.get(
  '/coupons/my-coupons',
  appApiKeyAuth,
  appAuthenticateToken,
  couponController.getUserCoupons,
);

router.get(
  '/coupons/:userCouponId/qr',
  appApiKeyAuth,
  appAuthenticateToken,
  couponController.generateCouponQR,
);

// Admin routes for restaurant owners
router.get(
  '/admin/coupons/:restaurantId',
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
  couponController.getRestaurantCoupons,
);

router.post(
  '/admin/coupons',
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
  couponController.createCoupon,
);

router.put(
  '/admin/coupons/:id',
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
  couponController.updateCoupon,
);

router.delete(
  '/admin/coupons/:id',
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
  couponController.deleteCoupon,
);

// Restaurant staff routes for redeeming coupons
router.post(
  '/admin/restaurants/:restaurantId/coupons/redeem',
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
  couponController.redeemUserCoupon,
);

module.exports = router;
