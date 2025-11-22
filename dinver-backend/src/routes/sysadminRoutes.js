const express = require('express');
const authRoutes = require('./sysadminRoutes/authRoutes');
const sysadminRoutes = require('./sysadminRoutes/syadminRoutes');
const auditLogRoutes = require('./sysadminRoutes/auditLogRoutes');
const menuRoutes = require('./sysadminRoutes/menuRoutes');
const restaurantRoutes = require('./sysadminRoutes/restaurantRoutes');
const typeRoutes = require('./sysadminRoutes/typeRoutes');
const userRoutes = require('./sysadminRoutes/userRoutes');
const claimLogRoutes = require('./sysadminRoutes/claimLogRoutes');
const backupRoutes = require('./sysadminRoutes/backupRoutes');
const drinkRoutes = require('./sysadminRoutes/drinkRoutes');
const blogRoutes = require('./sysadminRoutes/blogRoutes');
const blogUserRoutes = require('./sysadminRoutes/blogUserRoutes');
const newsletterRoutes = require('./sysadminRoutes/newsletterRoutes');
const analyticsRoutes = require('./sysadminRoutes/analyticsRoutes');
const qrPrintRequestRoutes = require('./sysadminRoutes/qrPrintRequestRoutes');
const couponRoutes = require('./sysadminRoutes/couponRoutes');
const jsonMenuImportRoutes = require('./sysadminRoutes/jsonMenuImportRoutes');
const referralRoutes = require('./sysadminRoutes/referralRoutes');
const sizeRoutes = require('./sysadminRoutes/sizeRoutes');
const waitListRoutes = require('./sysadminRoutes/waitListRoutes');
const visitRoutes = require('./sysadminRoutes/visitRoutes'); // NEW: Visit management
const leaderboardCycleRoutes = require('./sysadminRoutes/leaderboardCycleRoutes');
const reviewRoutes = require('./sysadminRoutes/reviewRoutes');
const experienceRoutes = require('./sysadminRoutes/experienceRoutes');
const receiptRoutes = require('./sysadminRoutes/receiptRoutes'); // Receipt & OCR Analytics
const cacheRoutes = require('./sysadminRoutes/cacheRoutes'); // Google Places Cache Stats
const router = express.Router();

router.use(sysadminRoutes);
router.use(auditLogRoutes);
router.use(authRoutes);
router.use(menuRoutes);
router.use(restaurantRoutes);
router.use(typeRoutes);
router.use(userRoutes);
router.use(claimLogRoutes);
router.use(backupRoutes);
router.use(drinkRoutes);
router.use(auditLogRoutes);
router.use(blogRoutes);
router.use(blogUserRoutes);
router.use(newsletterRoutes);
router.use(analyticsRoutes);
router.use(qrPrintRequestRoutes);
router.use(couponRoutes);
router.use('/json-menu-import', jsonMenuImportRoutes);
router.use(referralRoutes);
router.use(sizeRoutes);
router.use(waitListRoutes);
router.use(visitRoutes); // NEW: Visit management
router.use(leaderboardCycleRoutes);
router.use(reviewRoutes);
router.use(experienceRoutes); // Experience moderation za sysadmin
router.use(receiptRoutes); // Receipt management, OCR Analytics & Receipt Analytics
router.use(cacheRoutes); // Google Places Cache Stats & Management

module.exports = router;
