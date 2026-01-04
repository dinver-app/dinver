const app = require('./app');
const http = require('http');
const { Sequelize } = require('sequelize');
const cron = require('node-cron');
const leaderboardCycleManager = require('./cron/leaderboardCycleManager');
const { initializeSocket } = require('./socket');

const PORT = process.env.PORT || 3000;

const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const { logs } = require('@opentelemetry/api-logs');

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config,
  );
}

sequelize.sync().then(() => {
  const httpServer = http.createServer(app);
  initializeSocket(httpServer);
  httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`WebSocket server ready`);

    // Start leaderboard cycle management cron job
    // Run every minute
    cron.schedule('* * * * *', async () => {
      console.log('Running leaderboard cycle check...');
      await leaderboardCycleManager.checkAndUpdateCycles();
    });

    console.log('Leaderboard cycle cron job scheduled to run every hour');

    const logger = logs.getLogger('logger-first');
    logger.emit(
      {
        severityText: 'info',
        body: `Application started successfully (${new Date().toISOString()}) `,
        attributes: {port: PORT, environment: env}
      }
    );
  });
});
