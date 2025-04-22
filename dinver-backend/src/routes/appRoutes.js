const express = require('express');
const authRoutes = require('./appRoutes/authRoutes');
const restaurantRoutes = require('./appRoutes/restaurantRoutes');
const favoriteRoutes = require('./appRoutes/favoriteRoutes');
const reviewRoutes = require('./appRoutes/reviewRoutes');
const reservationRoutes = require('./appRoutes/reservationRoutes');
const achievementRoutes = require('./appRoutes/achievementRoutes');
const pointsRoutes = require('./appRoutes/pointsRoutes');

const router = express.Router();

router.use(authRoutes);
router.use(restaurantRoutes);
router.use(favoriteRoutes);
router.use(reviewRoutes);
router.use(reservationRoutes);
router.use(achievementRoutes);
router.use(pointsRoutes);

module.exports = router;
