const express = require('express');
const restaurantRoutes = require('./landingRoutes/restaurantRoutes');
const analyticsRoutes = require('./landingRoutes/analyticsRoutes');
const waitListRoutes = require('./landingRoutes/waitListRoutes');

const router = express.Router();

router.use(restaurantRoutes);
router.use(analyticsRoutes);
router.use(waitListRoutes);

module.exports = router;
