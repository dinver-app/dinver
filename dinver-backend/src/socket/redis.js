const Redis = require('ioredis');
const { createAdapter } = require('@socket.io/redis-adapter');

let pubClient = null;
let subClient = null;

function createRedisClients() {
  const commonConfig = {
    retryStrategy: (times) => {
      if (times > 10) {
        console.log(
          '[Redis] Max retries reached, stopping reconnection attempts',
        );
        return null;
      }
      const delay = Math.min(times * 50, 2000);
      console.log(`[Redis] Retry attempt ${times}, waiting ${delay}ms`);
      return delay;
    },
    enableReadyCheck: true,
    maxRetriesPerRequest: null,
    lazyConnect: false,
    enableOfflineQueue: true,
    reconnectOnError: (err) => {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    },
    tls: process.env.REDIS_URL?.includes('upstash') ? {} : undefined,
  };

  if (process.env.REDIS_URL) {
    pubClient = new Redis(process.env.REDIS_URL, commonConfig);
  } else {
    const redisConfig = {
      host: 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      ...commonConfig,
    };

    if (process.env.REDIS_PASSWORD) {
      redisConfig.password = process.env.REDIS_PASSWORD;
    }

    pubClient = new Redis(redisConfig);
  }

  subClient = pubClient.duplicate();

  pubClient.on('error', (err) => {
    console.error('[Redis Pub] Connection error:', err.message);
  });

  subClient.on('error', (err) => {
    console.error('[Redis Sub] Connection error:', err.message);
  });

  pubClient.on('connect', () => {
    console.log('[Redis Pub] Connected successfully');
  });

  subClient.on('connect', () => {
    console.log('[Redis Sub] Connected successfully');
  });

  pubClient.on('ready', () => {
    console.log('[Redis Pub] Ready to accept commands');
  });

  subClient.on('ready', () => {
    console.log('[Redis Sub] Ready to accept commands');
  });

  pubClient.on('close', () => {
    console.log('[Redis Pub] Connection closed');
  });

  subClient.on('close', () => {
    console.log('[Redis Sub] Connection closed');
  });

  return { pubClient, subClient };
}

function createSocketRedisAdapter() {
  if (!pubClient || !subClient) {
    const clients = createRedisClients();
    pubClient = clients.pubClient;
    subClient = clients.subClient;
  }

  const adapter = createAdapter(pubClient, subClient, {
    key: 'dinver:socket.io',
    requestsTimeout: 5000,
  });

  return adapter;
}

async function closeRedisClients() {
  if (pubClient) await pubClient.quit();
  if (subClient) await subClient.quit();
  console.log('[Redis] Connections closed');
}

module.exports = {
  createRedisClients,
  createSocketRedisAdapter,
  closeRedisClients,
  getPubClient: () => pubClient,
  getSubClient: () => subClient,
};
