const express = require('express');
const restaurantRoutes = require('./landingRoutes/restaurantRoutes');
const analyticsRoutes = require('./landingRoutes/analyticsRoutes');
const waitListRoutes = require('./landingRoutes/waitListRoutes');
const feedRoutes = require('./landingRoutes/feedRoutes');
const contactRoutes = require('./landingRoutes/contactRoutes');

const router = express.Router();

router.use(restaurantRoutes);
router.use(analyticsRoutes);
router.use(waitListRoutes);
router.use(feedRoutes);
router.use(contactRoutes);

module.exports = router;
