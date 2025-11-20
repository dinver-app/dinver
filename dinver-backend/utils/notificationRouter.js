/**
 * Notification Router Utility
 * Određuje gdje treba voditi svaka notifikacija na frontendu
 */

const NOTIFICATION_ROUTES = {
  // Restaurant related
  new_restaurant: (data) => ({
    screen: 'RestaurantDetails',
    params: { restaurantId: data.restaurantId },
  }),

  // Reservation related
  new_reservation: (data) => ({
    screen: 'AdminReservationDetails',
    params: { reservationId: data.reservationId },
  }),
  reservation_confirmed: (data) => ({
    screen: 'ReservationDetails',
    params: { reservationId: data.reservationId },
  }),
  reservation_declined: (data) => ({
    screen: 'ReservationDetails',
    params: { reservationId: data.reservationId },
  }),
  alternative_time_suggested: (data) => ({
    screen: 'ReservationDetails',
    params: { reservationId: data.reservationId },
  }),
  reservation_cancelled_by_restaurant: (data) => ({
    screen: 'ReservationDetails',
    params: { reservationId: data.reservationId },
  }),

  // Message related
  new_message_from_user: (data) => ({
    screen: 'AdminReservationChat',
    params: {
      reservationId: data.reservationId,
      restaurantId: data.restaurantId,
    },
  }),
  new_message_from_restaurant: (data) => ({
    screen: 'ReservationChat',
    params: {
      reservationId: data.reservationId,
      restaurantId: data.restaurantId,
    },
  }),

  // Social related
  user_followed_you: (data) => ({
    screen: 'UserProfile',
    params: { userId: data.actorUserId },
  }),
};

/**
 * Dohvaća routing informacije za notifikaciju
 * @param {Object} notification - Notification objekt
 * @returns {Object} - { screen, params }
 */
const getNotificationRoute = (notification) => {
  const routeFunc = NOTIFICATION_ROUTES[notification.type];

  if (!routeFunc) {
    console.warn(`Unknown notification type: ${notification.type}`);
    return { screen: 'Home', params: {} };
  }

  try {
    return routeFunc(notification.data || {});
  } catch (error) {
    console.error(
      `Error getting route for notification type ${notification.type}:`,
      error,
    );
    return { screen: 'Home', params: {} };
  }
};

/**
 * Validiraj tip notifikacije
 * @param {string} type - Notification type
 * @returns {boolean}
 */
const isValidNotificationType = (type) => {
  return Object.keys(NOTIFICATION_ROUTES).includes(type);
};

module.exports = {
  NOTIFICATION_ROUTES,
  getNotificationRoute,
  isValidNotificationType,
};
