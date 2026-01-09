const cluster = require('cluster');
const os = require('os');
const process = require('process');
const { logs } = require('@opentelemetry/api-logs');

const env = process.env.NODE_ENV || 'development';
// Load config BEFORE requiring app (which requires models)
const config = require(__dirname + '/../config/config.json')[env];

// Optimize DB connection pool for clustering
// With multiple workers, the total connections = (workers * pool_max) + primary_pool
if (!config.pool) {
  config.pool = { max: 5, min: 0, acquire: 30000, idle: 10000 };
}

if (cluster.isPrimary) {
  // Primary only processes cron jobs and worker management
  config.pool.max = 2;
  config.pool.min = 0;
} else {
  // Distribute connections among workers
  // Example: 4 cores * 10 connections = 40 max connections (plus primary)
  config.pool.max = 10;
  config.pool.min = 2;
}

const app = require('./app');
const http = require('http');
const cron = require('node-cron');
const leaderboardCycleManager = require('./cron/leaderboardCycleManager');
const { initializeSocket } = require('./socket');
const db = require('../models'); // Import single DB instance

const PORT = process.env.PORT || 3000;

const syncPromise = Promise.resolve();

syncPromise.then(() => {
  if (cluster.isPrimary) {
    const numCPUs = os.cpus().length;
    console.log(`Primary ${process.pid} is running`);
    console.log(`Forking for ${numCPUs} CPUs`);

    // Fork workers.
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
      console.log(`worker ${worker.process.pid} died`);
      // Replace the dead worker
      cluster.fork();
    });

    // Start leaderboard cycle management cron job
    // Run every minute - ONLY ON PRIMARY
    cron.schedule('* * * * *', async () => {
      console.log('Running leaderboard cycle check on Primary...');
      await leaderboardCycleManager.checkAndUpdateCycles();
    });

    console.log(
      'Leaderboard cycle cron job scheduled to run every hour (Primary)',
    );
  } else {
    const httpServer = http.createServer(app);
    initializeSocket(httpServer);
    httpServer.listen(PORT, () => {
      console.log(`Worker ${process.pid} started on port ${PORT}`);
      console.log(`WebSocket server ready`);

      const logger = logs.getLogger('logger-first');
      logger.emit({
        severityText: 'info',
        body: `Application started successfully (${new Date().toISOString()}) `,
        attributes: { port: PORT, environment: env, pid: process.pid },
      });
    });
  }
});
