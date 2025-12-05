const app = require('./app');
const { Sequelize } = require('sequelize');
const cron = require('node-cron');
const leaderboardCycleManager = require('./cron/leaderboardCycleManager');
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
const { BatchLogRecordProcessor } = require('@opentelemetry/sdk-logs');
const { resourceFromAttributes } = require('@opentelemetry/resources');

const PORT = process.env.PORT || 3000;

const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

if (env !== 'development')  {
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      'service.name': `dinver-backend-${env}`,
    }),
    logRecordProcessor: new BatchLogRecordProcessor(
      new OTLPLogExporter({
        url: 'https://eu.i.posthog.com/i/v1/logs',
        headers: {
          'Authorization': `Bearer ${process.env.POSTHOG_API_KEY}`
        }
      })
    )
  });
  
  sdk.start();
}

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
    // Run every minute
    cron.schedule('* * * * *', async () => {
      console.log('Running leaderboard cycle check...');
      await leaderboardCycleManager.checkAndUpdateCycles();
    });

    console.log('Leaderboard cycle cron job scheduled to run every hour');
  });
});
