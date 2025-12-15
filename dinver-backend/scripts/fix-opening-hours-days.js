const { Restaurant } = require('../models');

/**
 * Fix opening hours days - shift all days by -1
 * This fixes the issue where days were incorrectly shifted by +1 during import
 * (Sunday/0 became Monday/1, Friday/5 became Saturday/6, etc.)
 *
 * Only updates restaurants where isClaimed = false
 */
async function fixOpeningHoursDays() {
  try {
    console.log('Starting opening hours fix...\n');

    // Get all unclaimed restaurants with opening hours
    const restaurants = await Restaurant.findAll({
      where: {
        isClaimed: false,
      },
      attributes: ['id', 'name', 'openingHours', 'isClaimed'],
    });

    console.log(`Found ${restaurants.length} unclaimed restaurants\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const restaurant of restaurants) {
      try {
        const { id, name, openingHours } = restaurant;

        // Skip if no opening hours or empty object
        if (!openingHours ||
            Object.keys(openingHours).length === 0 ||
            !openingHours.periods ||
            !Array.isArray(openingHours.periods) ||
            openingHours.periods.length === 0) {
          console.log(`⏭️  Skipping "${name}" - no opening hours data`);
          skippedCount++;
          continue;
        }

        // Create new periods array with corrected days
        const correctedPeriods = openingHours.periods.map(period => {
          const correctedPeriod = { ...period };

          // Fix open day
          if (period.open && typeof period.open.day === 'number') {
            // Shift day back by 1 (with wrap-around: 0 becomes 6)
            correctedPeriod.open = {
              ...period.open,
              day: period.open.day === 0 ? 6 : period.open.day - 1
            };
          }

          // Fix close day
          if (period.close && typeof period.close.day === 'number') {
            // Shift day back by 1 (with wrap-around: 0 becomes 6)
            correctedPeriod.close = {
              ...period.close,
              day: period.close.day === 0 ? 6 : period.close.day - 1
            };
          }

          return correctedPeriod;
        });

        // Update the restaurant
        const correctedOpeningHours = {
          ...openingHours,
          periods: correctedPeriods
        };

        await restaurant.update({ openingHours: correctedOpeningHours });

        console.log(`✅ Updated "${name}"`);
        console.log(`   Before: ${JSON.stringify(openingHours.periods[0])}`);
        console.log(`   After:  ${JSON.stringify(correctedPeriods[0])}\n`);

        updatedCount++;
      } catch (err) {
        console.error(`❌ Error updating "${restaurant.name}":`, err.message);
        errorCount++;
      }
    }

    console.log('\n=== SUMMARY ===');
    console.log(`✅ Updated: ${updatedCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total: ${restaurants.length}`);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  fixOpeningHoursDays()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ Script failed:', err);
      process.exit(1);
    });
}

module.exports = { fixOpeningHoursDays };
