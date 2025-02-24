const express = require('express');
const adminRoutes = require('./sysadminRoutes/adminRoutes');
const auditLogRoutes = require('./sysadminRoutes/auditLogRoutes');
const authRoutes = require('./sysadminRoutes/authRoutes');
const menuRoutes = require('./sysadminRoutes/menuRoutes');
const restaurantRoutes = require('./sysadminRoutes/restaurantRoutes');
const typeRoutes = require('./sysadminRoutes/typeRoutes');
const userRoutes = require('./sysadminRoutes/userRoutes');

const router = express.Router();

router.use(adminRoutes);
router.use(auditLogRoutes);
router.use(authRoutes);
router.use(menuRoutes);
router.use(restaurantRoutes);
router.use(typeRoutes);
router.use(userRoutes);

module.exports = router;
