/**
 * Test script for cleanupExpiredVisits cron job
 *
 * This script tests the cron job logic without actually deleting data
 * Run with: node test-cleanup-cron.js
 */

const { Op } = require('sequelize');
const { Visit, Experience, UserFavorite } = require('./models');

async function testCleanupLogic() {
  console.log('Testing cleanupExpiredVisits logic...\n');

  const now = new Date();
  console.log(`Current time: ${now.toISOString()}\n`);

  try {
    // Find all expired visits (REJECTED with retakeDeadline passed)
    const expiredVisits = await Visit.findAll({
      where: {
        status: 'REJECTED',
        retakeDeadline: {
          [Op.lt]: now
        }
      },
      attributes: ['id', 'userId', 'restaurantId', 'wasInMustVisit', 'retakeDeadline'],
      include: [
        {
          model: require('./models').Restaurant,
          as: 'restaurant',
          attributes: ['name']
        }
      ]
    });

    console.log(`Found ${expiredVisits.length} expired visit(s)\n`);

    if (expiredVisits.length === 0) {
      console.log('✓ No expired visits to clean up. This is normal if there are no rejected visits past their deadline.');
      process.exit(0);
    }

    // Check each expired visit
    for (const visit of expiredVisits) {
      console.log(`Visit ${visit.id}:`);
      console.log(`  - Restaurant: ${visit.restaurant?.name || 'Unknown'}`);
      console.log(`  - User ID: ${visit.userId}`);
      console.log(`  - Retake deadline: ${visit.retakeDeadline?.toISOString()}`);
      console.log(`  - Was in Must Visit: ${visit.wasInMustVisit}`);

      // Check for associated Experience
      const experience = await Experience.findOne({
        where: { visitId: visit.id },
        attributes: ['id']
      });

      if (experience) {
        console.log(`  - Has associated Experience: ${experience.id}`);
      } else {
        console.log(`  - No associated Experience`);
      }

      // Check for UserFavorite to restore
      if (visit.wasInMustVisit) {
        const favorite = await UserFavorite.findOne({
          where: {
            userId: visit.userId,
            restaurantId: visit.restaurantId,
            removedAt: { [Op.ne]: null },
            removedForVisitId: visit.id
          }
        });

        if (favorite) {
          console.log(`  - Found UserFavorite entry to restore (ID: ${favorite.id})`);
        } else {
          console.log(`  - WARNING: wasInMustVisit=true but no UserFavorite found to restore`);
        }
      }

      console.log('');
    }

    console.log('✓ Test completed successfully');
    console.log('\nIMPORTANT: This was a DRY RUN. No data was actually deleted or modified.');
    console.log('The actual cron job will run every hour and perform these operations automatically.');

  } catch (error) {
    console.error('✗ Test failed with error:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the test
testCleanupLogic();
