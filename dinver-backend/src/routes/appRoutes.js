const express = require('express');
const authRoutes = require('./appRoutes/authRoutes');
const restaurantRoutes = require('./appRoutes/restaurantRoutes');
const favoriteRoutes = require('./appRoutes/favoriteRoutes');

const router = express.Router();

router.use(authRoutes);
router.use(restaurantRoutes);
router.use(favoriteRoutes);

module.exports = router;
