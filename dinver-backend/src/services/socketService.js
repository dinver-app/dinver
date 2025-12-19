const { getIO } = require('../socket');
const {
  emitNewMessage,
  emitStatusChange,
  emitReservationUpdate,
  emitUnreadCountUpdate,
  emitUserNotification,
} = require('../socket/reservation.socket');

function notifyNewMessage(reservationId, message) {
  const io = getIO();
  if (!io) {
    console.warn('[SocketService] IO not initialized, skipping message emit');
    return;
  }

  emitNewMessage(io, reservationId, message);
}

function notifyStatusChange(
  reservationId,
  oldStatus,
  newStatus,
  metadata = {},
) {
  const io = getIO();
  if (!io) {
    console.warn(
      '[SocketService] IO not initialized, skipping status change emit',
    );
    return;
  }

  emitStatusChange(io, reservationId, {
    oldStatus,
    newStatus,
    ...metadata,
  });
}

function notifyReservationUpdate(reservationId, reservation) {
  const io = getIO();
  if (!io) {
    console.warn(
      '[SocketService] IO not initialized, skipping reservation update emit',
    );
    return;
  }

  emitReservationUpdate(io, reservationId, reservation);
}

function notifyUnreadCountUpdate(restaurantId, countData) {
  const io = getIO();
  if (!io) {
    console.warn(
      '[SocketService] IO not initialized, skipping count update emit',
    );
    return;
  }

  emitUnreadCountUpdate(io, restaurantId, countData);
}

function notifyUser(userId, notification) {
  const io = getIO();
  if (!io) {
    console.warn(
      '[SocketService] IO not initialized, skipping user notification emit',
    );
    return;
  }

  emitUserNotification(io, userId, notification);
}

module.exports = {
  notifyNewMessage,
  notifyStatusChange,
  notifyReservationUpdate,
  notifyUnreadCountUpdate,
  notifyUser,
};
