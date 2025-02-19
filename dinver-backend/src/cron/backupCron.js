// dinver-backend/src/cron/backupCron.js
const { Restaurant } = require('../../models');
const { createBackup } = require('../controllers/backupController');

// Funkcija za kreiranje backupa za sve restorane
async function createDailyBackups() {
  console.log('Creating daily backups');
  try {
    const claimedRestaurants = await Restaurant.findAll({
      where: { isClaimed: true },
      attributes: ['id'],
    });

    for (const restaurant of claimedRestaurants) {
      const restaurantId = restaurant.id;
      // Pozovite funkciju za kreiranje backupa
      await createBackup(
        { params: { restaurantId } },
        { status: () => ({ json: () => {} }) },
      );
    }

    console.log('Daily backups created successfully');
  } catch (error) {
    console.error('Error creating daily backups:', error);
  }
}

module.exports = { createDailyBackups };
