const { Server } = require('socket.io');
const { createSocketRedisAdapter } = require('./redis');
const { authenticateSocket } = require('./auth');
const { initReservationSocketHandlers } = require('./reservation.socket');

let io = null;

function initializeSocket(httpServer) {
  if (io) {
    console.warn('[Socket] Socket.IO already initialized');
    return io;
  }

  io = new Server(httpServer, {
    cors: {
      origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:8081',
        'https://app.dinver.eu',
        'https://admin.dinver.eu',
        'https://sysadmin.dinver.eu',
        'https://dinver-staging-landing.vercel.app',
        /^https:\/\/([a-zA-Z0-9-]+\.)*dinver\.eu$/,
      ],
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  const redisAdapter = createSocketRedisAdapter();
  io.adapter(redisAdapter);

  console.log('[Socket] Redis adapter configured for horizontal scaling');

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(
      `[Socket] Client connected: ${socket.id}, User: ${socket.userId} (${socket.user.name})`,
    );

    initReservationSocketHandlers(socket, io);

    socket.on('disconnect', (reason) => {
      console.log(
        `[Socket] Client disconnected: ${socket.id}, User: ${socket.userId}, Reason: ${reason}`,
      );
    });

    socket.on('error', (error) => {
      console.error(`[Socket] Socket error for user ${socket.userId}:`, error);
    });

    socket.emit('connected', {
      message: 'Connected to Dinver WebSocket',
      userId: socket.userId,
      socketId: socket.id,
    });
  });

  console.log('[Socket] Socket.IO server initialized successfully');

  return io;
}

function getIO() {
  if (!io) console.warn('[Socket] Socket.IO not initialized yet');

  return io;
}

async function closeSocket() {
  if (io) {
    await io.close();
    io = null;
    console.log('[Socket] Socket.IO server closed');
  }
}

module.exports = {
  initializeSocket,
  getIO,
  closeSocket,
};
