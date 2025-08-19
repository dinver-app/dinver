const express = require('express');
const couponController = require('../../controllers/couponController');
const {
  checkSysadmin,
  sysadminAuthenticateToken,
} = require('../../middleware/roleMiddleware');
const multer = require('multer');

const router = express.Router();
const upload = multer();

// Get all system coupons
router.get(
  '/coupons',
  sysadminAuthenticateToken,
  checkSysadmin,
  couponController.getSystemCoupons,
);

// Create a new coupon
router.post(
  '/coupons',
  sysadminAuthenticateToken,
  checkSysadmin,
  upload.single('imageFile'),
  couponController.createCoupon,
);

// Update a coupon
router.put(
  '/coupons/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  upload.single('imageFile'),
  couponController.updateCoupon,
);

// Delete system-wide coupon
router.delete(
  '/coupons/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  couponController.deleteCoupon,
);

// Get available coupons for customers (public view)
router.get(
  '/coupons/available',
  sysadminAuthenticateToken,
  checkSysadmin,
  couponController.getAvailableCoupons,
);

// Get coupon statistics
router.get(
  '/coupons/stats',
  sysadminAuthenticateToken,
  checkSysadmin,
  couponController.getCouponStats,
);

module.exports = router;
