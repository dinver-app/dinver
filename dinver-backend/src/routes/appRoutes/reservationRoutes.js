const express = require('express');
const reservationController = require('../../controllers/reservationController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
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
  checkAdmin,
  reservationController.getRestaurantReservations,
);

router.patch(
  '/reservations/:id/confirm',
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
  reservationController.confirmReservation,
);

router.patch(
  '/reservations/:id/decline',
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
  reservationController.declineReservation,
);

router.patch(
  '/reservations/:id/suggest',
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
  reservationController.suggestAlternativeTime,
);

// Ruta za otkazivanje od strane restorana
router.patch(
  '/reservations/:id/cancel-by-restaurant',
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
  reservationController.cancelReservationByRestaurant,
);

// Ruta za prihvaćanje predloženog termina
router.patch(
  '/reservations/:id/accept-suggested',
  appApiKeyAuth,
  appAuthenticateToken,
  reservationController.acceptSuggestedTime,
);

router.get(
  '/reservations/available-times',
  appApiKeyAuth,
  appAuthenticateToken,
  reservationController.getAvailableTimes,
);

// Ruta za kreiranje custom rezervacija
router.post(
  '/restaurants/:restaurantId/custom-reservations',
  appApiKeyAuth,
  appAuthenticateToken,
  checkAdmin,
  reservationController.createCustomReservation,
);

module.exports = router;
