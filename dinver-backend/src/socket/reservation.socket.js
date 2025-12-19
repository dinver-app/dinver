const {
  authorizeReservationAccess,
  authorizeRestaurantAccess,
} = require('./auth');

function initReservationSocketHandlers(socket, io) {
  socket.on('reservation:join', async ({ reservationId }) => {
    try {
      if (!reservationId) {
        socket.emit('error', { message: 'Reservation ID is required' });
        return;
      }

      const auth = await authorizeReservationAccess(
        socket.userId,
        reservationId,
      );

      if (!auth.authorized) {
        socket.emit('error', {
          message: auth.reason || 'Unauthorized',
          event: 'reservation:join',
        });
        return;
      }

      const roomName = `reservation:${reservationId}`;
      socket.join(roomName);

      console.log(
        `[Socket] User ${socket.userId} joined reservation room: ${roomName} (role: ${auth.role})`,
      );

      socket.emit('reservation:joined', {
        reservationId,
        room: roomName,
        role: auth.role,
      });
    } catch (error) {
      console.error('[Socket] Error joining reservation room:', error);
      socket.emit('error', {
        message: 'Failed to join reservation room',
        event: 'reservation:join',
      });
    }
  });

  socket.on('reservation:leave', ({ reservationId }) => {
    if (!reservationId) {
      return;
    }

    const roomName = `reservation:${reservationId}`;
    socket.leave(roomName);

    console.log(
      `[Socket] User ${socket.userId} left reservation room: ${roomName}`,
    );
  });

  socket.on('restaurant:join', async ({ restaurantId }) => {
    try {
      if (!restaurantId) {
        socket.emit('error', { message: 'Restaurant ID is required' });
        return;
      }

      const auth = await authorizeRestaurantAccess(socket.userId, restaurantId);

      if (!auth.authorized) {
        socket.emit('error', {
          message: auth.reason || 'Unauthorized',
          event: 'restaurant:join',
        });
        return;
      }

      const roomName = `restaurant:${restaurantId}`;
      socket.join(roomName);

      console.log(
        `[Socket] User ${socket.userId} joined restaurant room: ${roomName}`,
      );

      socket.emit('restaurant:joined', {
        restaurantId,
        room: roomName,
      });
    } catch (error) {
      console.error('[Socket] Error joining restaurant room:', error);
      socket.emit('error', {
        message: 'Failed to join restaurant room',
        event: 'restaurant:join',
      });
    }
  });

  socket.on('restaurant:leave', ({ restaurantId }) => {
    if (!restaurantId) return;

    const roomName = `restaurant:${restaurantId}`;
    socket.leave(roomName);

    console.log(
      `[Socket] User ${socket.userId} left restaurant room: ${roomName}`,
    );
  });

  socket.on('user:join', () => {
    const roomName = `user:${socket.userId}`;
    socket.join(roomName);

    console.log(
      `[Socket] User ${socket.userId} joined personal room: ${roomName}`,
    );

    socket.emit('user:joined', {
      userId: socket.userId,
      room: roomName,
    });
  });

  const userRoom = `user:${socket.userId}`;
  socket.join(userRoom);
  console.log(
    `[Socket] User ${socket.userId} auto-joined personal room: ${userRoom}`,
  );
}

function emitNewMessage(io, reservationId, message) {
  const roomName = `reservation:${reservationId}`;

  io.to(roomName).emit('reservation:message:new', {
    reservationId,
    message,
    timestamp: new Date().toISOString(),
  });

  console.log(`[Socket] Emitted new message to room: ${roomName}`);
}

function emitStatusChange(io, reservationId, payload) {
  const roomName = `reservation:${reservationId}`;

  io.to(roomName).emit('reservation:status:changed', {
    reservationId,
    ...payload,
    timestamp: new Date().toISOString(),
  });

  console.log(
    `[Socket] Emitted status change to room: ${roomName}, status: ${payload.newStatus}`,
  );
}

function emitReservationUpdate(io, reservationId, reservation) {
  const roomName = `reservation:${reservationId}`;

  io.to(roomName).emit('reservation:update', {
    reservationId,
    reservation,
    timestamp: new Date().toISOString(),
  });

  console.log(`[Socket] Emitted reservation update to room: ${roomName}`);
}

function emitUnreadCountUpdate(io, restaurantId, countData) {
  const roomName = `restaurant:${restaurantId}`;

  io.to(roomName).emit('reservation:count:update', {
    restaurantId,
    ...countData,
    timestamp: new Date().toISOString(),
  });

  console.log(`[Socket] Emitted count update to room: ${roomName}`);
}

function emitUserNotification(io, userId, notification) {
  const roomName = `user:${userId}`;

  io.to(roomName).emit('notification:new', {
    userId,
    notification,
    timestamp: new Date().toISOString(),
  });

  console.log(`[Socket] Emitted notification to user: ${userId}`);
}

module.exports = {
  initReservationSocketHandlers,
  emitNewMessage,
  emitStatusChange,
  emitReservationUpdate,
  emitUnreadCountUpdate,
  emitUserNotification,
};
