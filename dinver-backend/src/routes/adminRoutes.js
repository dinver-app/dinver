const express = require('express');
const adminRoutes = require('./adminRoutes/adminRoutes');
const auditLogRoutes = require('./adminRoutes/auditLogRoutes');
const authRoutes = require('./adminRoutes/authRoutes');
const menuRoutes = require('./adminRoutes/menuRoutes');
const restaurantRoutes = require('./adminRoutes/restaurantRoutes');
const typeRoutes = require('./adminRoutes/typeRoutes');
const userRoutes = require('./adminRoutes/userRoutes');

const router = express.Router();

router.use(adminRoutes);
router.use(auditLogRoutes);
router.use(authRoutes);
router.use(menuRoutes);
router.use(restaurantRoutes);
router.use(typeRoutes);
router.use(userRoutes);

module.exports = router;
