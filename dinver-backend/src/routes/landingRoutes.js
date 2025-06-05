const express = require('express');
const restaurantRoutes = require('./landingRoutes/restaurantRoutes');

const router = express.Router();

router.use(restaurantRoutes);

module.exports = router;
