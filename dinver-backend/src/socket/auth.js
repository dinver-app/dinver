const jwt = require('jsonwebtoken');
const { User } = require('../../models');

const JWT_SECRET = process.env.JWT_SECRET;

async function authenticateSocket(socket, next) {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization ||
      socket.handshake.query?.token;

    if (!token) return next(new Error('Authentication required'));

    const tokenValue = token.replace(/^Bearer\s+/i, '');

    const decoded = jwt.verify(tokenValue, JWT_SECRET);

    if (!decoded || !decoded.id) return next(new Error('Invalid token'));

    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'name', 'email', 'banned'],
    });

    if (!user) return next(new Error('User not found'));

    if (user.banned) return next(new Error('User is banned'));

    socket.userId = user.id;
    socket.user = user;

    console.log(`[Socket Auth] User ${user.id} (${user.name}) authenticated`);

    next();
  } catch (error) {
    console.error('[Socket Auth] Authentication failed:', error.message);

    if (error.name === 'JsonWebTokenError')
      return next(new Error('Invalid token'));

    if (error.name === 'TokenExpiredError')
      return next(new Error('Token expired'));

    return next(new Error('Authentication failed'));
  }
}

async function authorizeReservationAccess(userId, reservationId) {
  const { Reservation, UserAdmin } = require('../../models');

  const reservation = await Reservation.findByPk(reservationId, {
    attributes: ['id', 'userId', 'restaurantId'],
  });

  if (!reservation)
    return { authorized: false, reason: 'Reservation not found' };

  if (reservation.userId === userId) return { authorized: true, role: 'user' };

  const isAdmin = await UserAdmin.findOne({
    where: {
      userId,
      restaurantId: reservation.restaurantId,
    },
  });

  if (isAdmin) return { authorized: true, role: 'admin' };

  return { authorized: false, reason: 'Unauthorized' };
}

async function authorizeRestaurantAccess(userId, restaurantId) {
  const { UserAdmin } = require('../../models');

  const isAdmin = await UserAdmin.findOne({
    where: {
      userId,
      restaurantId,
    },
  });

  if (isAdmin) return { authorized: true, role: 'admin' };

  return { authorized: false, reason: 'Unauthorized' };
}

module.exports = {
  authenticateSocket,
  authorizeReservationAccess,
  authorizeRestaurantAccess,
};
