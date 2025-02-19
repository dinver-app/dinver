// dinver-backend/src/runBackup.js
const { createDailyBackups } = require('../src/cron/backupCron');

// Pozivanje funkcije za kreiranje backupa
createDailyBackups()
  .then(() => {
    console.log('Backup process completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error during backup process:', error);
    process.exit(1);
  });
