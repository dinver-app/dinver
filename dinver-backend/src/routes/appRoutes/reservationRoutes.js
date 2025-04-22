const express = require('express');
const reservationController = require('../../controllers/reservationController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
  restaurantOwnerAuth,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

// Korisničke rute
router.post(
  '/reservations',
  appApiKeyAuth,
  appAuthenticateToken,
  reservationController.createReservation,
);

router.get(
  '/reservations',
  appApiKeyAuth,
  appAuthenticateToken,
  reservationController.getUserReservations,
);

router.get(
  '/reservations/:id/history',
  appApiKeyAuth,
  appAuthenticateToken,
  reservationController.getReservationHistory,
);

router.patch(
  '/reservations/:id/cancel',
  appApiKeyAuth,
  appAuthenticateToken,
  reservationController.cancelReservation,
);

// Rute za vlasnike restorana
router.get(
  '/restaurants/:restaurantId/reservations',
  appApiKeyAuth,
  appAuthenticateToken,
  restaurantOwnerAuth,
  reservationController.getRestaurantReservations,
);

router.patch(
  '/reservations/:id/confirm',
  appApiKeyAuth,
  appAuthenticateToken,
  restaurantOwnerAuth,
  reservationController.confirmReservation,
);

router.patch(
  '/reservations/:id/decline',
  appApiKeyAuth,
  appAuthenticateToken,
  restaurantOwnerAuth,
  reservationController.declineReservation,
);

router.patch(
  '/reservations/:id/suggest',
  appApiKeyAuth,
  appAuthenticateToken,
  restaurantOwnerAuth,
  reservationController.suggestAlternativeTime,
);

// Ruta za prihvaćanje predloženog termina
router.patch(
  '/reservations/:id/accept-suggested',
  appApiKeyAuth,
  appAuthenticateToken,
  reservationController.acceptSuggestedTime,
);

module.exports = router;
