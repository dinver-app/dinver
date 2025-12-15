/**
 * Test lazy load on newly imported restaurant
 */
require('dotenv').config();
const { sequelize, Restaurant } = require('../models');
const { updateRestaurantFromGoogle } = require('../src/services/googlePlacesService');

async function testLazyLoad() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Find Gostilna Repnik (newly imported)
    const restaurant = await Restaurant.findOne({
      where: { slug: 'gostilna-repnik-primoz-repnik-sp' },
    });

    if (!restaurant) {
      console.log('❌ Restaurant not found');
      return;
    }

    console.log(`Testing lazy load for: ${restaurant.name}`);
    console.log(`Phone (before): ${restaurant.phone || 'NULL'}`);
    console.log(`OpeningHours (before): ${restaurant.openingHours ? 'SET' : 'NULL'}\n`);

    // Fetch from Google
    console.log('⏳ Fetching from Google Places...');
    const success = await updateRestaurantFromGoogle(restaurant.placeId, restaurant.id);

    if (success) {
      const updated = await Restaurant.findByPk(restaurant.id);
      console.log('\n✅ SUCCESS!\n');
      console.log(`Phone: ${updated.phone || 'NULL'}`);
      console.log(`OpeningHours: ${updated.openingHours ? 'SET' : 'NULL'}`);
      console.log(`Website: ${updated.websiteUrl || 'NULL'}`);
      console.log(`Country: ${updated.country || 'NULL'}\n`);

      if (updated.openingHours && updated.openingHours.periods) {
        console.log('Opening hours periods:');
        updated.openingHours.periods.slice(0, 3).forEach((period, i) => {
          console.log(`  ${i + 1}. Day ${period.open?.day}: ${period.open?.time} - ${period.close?.time}`);
        });
        console.log('\n📝 Expected: Day 3=Wed, 4=Thu, 5=Fri, 6=Sat (restaurant closes Wed-Sat)');
      }
    } else {
      console.log('\n❌ Failed to fetch');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

testLazyLoad();
