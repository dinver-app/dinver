const express = require('express');
const restaurantRoutes = require('./landingRoutes/restaurantRoutes');
const analyticsRoutes = require('./landingRoutes/analyticsRoutes');

const router = express.Router();

router.use(restaurantRoutes);
router.use(analyticsRoutes);

module.exports = router;
