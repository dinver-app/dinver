const app = require('./app');
const { Sequelize } = require('sequelize');
const cron = require('node-cron');
const leaderboardCycleManager = require('./cron/leaderboardCycleManager');

const PORT = process.env.PORT || 3000;

const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

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
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);

    // Start leaderboard cycle management cron job
    // Run every hour at minute 0
    cron.schedule('0 * * * *', async () => {
      console.log('Running leaderboard cycle check...');
      await leaderboardCycleManager.checkAndUpdateCycles();
    });

    console.log('Leaderboard cycle cron job scheduled to run every hour');
  });
});
