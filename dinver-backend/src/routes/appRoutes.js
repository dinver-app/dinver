const express = require('express');
const authRoutes = require('./appRoutes/authRoutes');
const restaurantRoutes = require('./appRoutes/restaurantRoutes');

const router = express.Router();

router.use(authRoutes);
router.use(restaurantRoutes);

module.exports = router;
