/**
 * Test script for nearYou endpoint with Google Places integration
 *
 * Usage:
 * node scripts/test-near-you.js
 *
 * Tests:
 * 1. nearYou flow - fetch unclaimed restaurants from Google Places
 * 2. getFullRestaurantDetails - automatic lazy load for missing data
 */

require('dotenv').config();
const { sequelize, Restaurant } = require('../models');
const {
  searchNearbyRestaurants,
  importUnclaimedRestaurantBasic,
  updateRestaurantFromGoogle,
} = require('../src/services/googlePlacesService');

// Test Ljubljana (likely has few/no claimed restaurants)
const TEST_LOCATION = {
  name: 'Ljubljana, Slovenia',
  lat: 46.0569,
  lng: 14.5058,
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

async function testNearYouFlow() {
  console.log('\n🧪 TEST 1: nearYou Flow - Unclaimed Restaurants');
  console.log('='.repeat(70));
  console.log(`📍 Location: ${TEST_LOCATION.name}`);
  console.log(`📍 Coordinates: ${TEST_LOCATION.lat}, ${TEST_LOCATION.lng}\n`);

  try {
    // Step 1: Check claimed restaurants in 60km
    console.log('Step 1: Checking claimed restaurants in database...');
    const claimedCount = await Restaurant.count({
      where: { isClaimed: true },
    });
    console.log(`   📊 Total claimed restaurants in DB: ${claimedCount}`);

    const nearbyRestaurants = await Restaurant.findAll({
      where: { isClaimed: true },
      attributes: ['id', 'name', 'place', 'latitude', 'longitude'],
    });

    const nearbyClaimed = nearbyRestaurants.filter((r) => {
      const distance = calculateDistance(
        TEST_LOCATION.lat,
        TEST_LOCATION.lng,
        parseFloat(r.latitude),
        parseFloat(r.longitude),
      );
      return distance <= 60;
    });

    console.log(`   📍 Claimed within 60km: ${nearbyClaimed.length}`);

    // Step 2: Check existing unclaimed restaurants
    console.log('\nStep 2: Checking existing unclaimed restaurants...');
    const existingUnclaimed = await Restaurant.findAll({
      where: { isClaimed: false },
      attributes: ['id', 'name', 'place', 'latitude', 'longitude', 'phone'],
    });

    const nearbyUnclaimed = existingUnclaimed.filter((r) => {
      const distance = calculateDistance(
        TEST_LOCATION.lat,
        TEST_LOCATION.lng,
        parseFloat(r.latitude),
        parseFloat(r.longitude),
      );
      return distance <= 60;
    });

    console.log(`   📊 Existing unclaimed in DB: ${existingUnclaimed.length}`);
    console.log(`   📍 Unclaimed within 60km: ${nearbyUnclaimed.length}`);

    const totalNearby = nearbyClaimed.length + nearbyUnclaimed.length;
    console.log(`\n   ✅ Total restaurants within 60km: ${totalNearby}`);

    // Step 3: Fetch from Google if needed
    if (totalNearby < 10) {
      console.log('\n⚠️  Less than 10 restaurants! Triggering Google Places fetch...\n');

      console.log('Step 3: Fetching from Google Places API...');
      const googleResults = await searchNearbyRestaurants(
        TEST_LOCATION.lat,
        TEST_LOCATION.lng,
        60000, // 60km
        30, // Limit
      );

      console.log(`   🌍 Google Places returned: ${googleResults.length} restaurants`);

      if (googleResults.length > 0) {
        console.log('\n   📝 Top 5 results:');
        googleResults.slice(0, 5).forEach((place, i) => {
          console.log(
            `      ${i + 1}. ${place.name} - ${place.address} (⭐ ${place.rating || 'N/A'})`,
          );
        });

        // Step 4: Import to database
        console.log('\n   💾 Importing restaurants to database...');

        let imported = 0;
        let skipped = 0;

        for (let i = 0; i < Math.min(30, googleResults.length); i++) {
          const place = googleResults[i];
          try {
            const restaurant = await importUnclaimedRestaurantBasic(place);

            if (restaurant) {
              const distance = calculateDistance(
                TEST_LOCATION.lat,
                TEST_LOCATION.lng,
                parseFloat(restaurant.latitude),
                parseFloat(restaurant.longitude),
              );

              // Check if it was newly created or already existed
              const isNew = restaurant.createdAt
                ? new Date() - new Date(restaurant.createdAt) < 5000
                : false;

              if (isNew) {
                imported++;
                console.log(
                  `      ✅ ${imported}. Imported: ${restaurant.name} (${distance.toFixed(1)}km)`,
                );
              } else {
                skipped++;
              }
            }
          } catch (error) {
            console.error(`      ❌ Failed: ${place.name} - ${error.message}`);
          }
        }

        console.log(`\n   📊 Import summary:`);
        console.log(`      ✅ Newly imported: ${imported}`);
        console.log(`      ⏭️  Already existed: ${skipped}`);
        console.log(`      📦 Total processed: ${imported + skipped}`);

        // Step 5: Verify in database
        console.log('\nStep 5: Verifying database state...');
        const finalUnclaimed = await Restaurant.count({
          where: { isClaimed: false },
        });
        console.log(`   �� Total unclaimed in DB now: ${finalUnclaimed}`);

        const finalNearbyUnclaimed = await Restaurant.findAll({
          where: { isClaimed: false },
          attributes: ['id', 'name', 'latitude', 'longitude', 'phone'],
        });

        const finalCount = finalNearbyUnclaimed.filter((r) => {
          const distance = calculateDistance(
            TEST_LOCATION.lat,
            TEST_LOCATION.lng,
            parseFloat(r.latitude),
            parseFloat(r.longitude),
          );
          return distance <= 60;
        }).length;

        console.log(`   📍 Unclaimed within 60km: ${finalCount}`);

        return finalNearbyUnclaimed.slice(0, 5); // Return first 5 for details test
      } else {
        console.log('   ❌ No results from Google Places');
        return [];
      }
    } else {
      console.log('\n✅ Sufficient restaurants found, no need for Google Places fetch');
      return nearbyUnclaimed.slice(0, 5);
    }
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    return [];
  }
}

async function testLazyLoadDetails(restaurants) {
  if (restaurants.length === 0) {
    console.log('\n⚠️  No restaurants to test lazy load');
    return;
  }

  console.log('\n\n🧪 TEST 2: Automatic Lazy Load - Restaurant Details');
  console.log('='.repeat(70));

  // Pick first restaurant without phone
  const testRestaurant = restaurants.find((r) => !r.phone) || restaurants[0];

  console.log(`\n📍 Testing restaurant: ${testRestaurant.name}`);
  console.log(`   ID: ${testRestaurant.id}`);
  console.log(`   Phone (before): ${testRestaurant.phone || 'NULL'}`);

  try {
    console.log('\n⏳ Simulating getFullRestaurantDetails call...');
    console.log('   (This would normally be triggered by frontend calling /details/:id)');

    // Find full restaurant record
    const restaurant = await Restaurant.findByPk(testRestaurant.id);

    if (!restaurant) {
      console.log('   ❌ Restaurant not found');
      return;
    }

    console.log(`\n   📊 Current state:`);
    console.log(`      - isClaimed: ${restaurant.isClaimed}`);
    console.log(`      - phone: ${restaurant.phone || 'NULL'}`);
    console.log(`      - openingHours: ${restaurant.openingHours ? 'SET' : 'NULL'}`);
    console.log(`      - placeId: ${restaurant.placeId}`);

    const needsUpdate =
      !restaurant.isClaimed &&
      restaurant.placeId &&
      (!restaurant.phone || !restaurant.openingHours);

    if (needsUpdate) {
      console.log('\n   ⚠️  Missing critical data - triggering Google Places fetch...');
      console.log('   ⏳ Fetching... (this may take 2-3 seconds)');

      const success = await updateRestaurantFromGoogle(
        restaurant.placeId,
        restaurant.id,
      );

      if (success) {
        console.log('   ✅ Successfully fetched from Google Places');

        // Verify update
        const updated = await Restaurant.findByPk(testRestaurant.id);

        console.log(`\n   📊 Updated state:`);
        console.log(`      - phone: ${updated.phone || 'NULL'} ${updated.phone ? '✅' : '❌'}`);
        console.log(
          `      - openingHours: ${updated.openingHours ? 'SET ✅' : 'NULL ❌'}`,
        );
        console.log(`      - websiteUrl: ${updated.websiteUrl || 'NULL'}`);
        console.log(
          `      - lastGoogleUpdate: ${updated.lastGoogleUpdate ? new Date(updated.lastGoogleUpdate).toLocaleString() : 'NULL'}`,
        );

        console.log('\n   ✨ Lazy load completed successfully!');
        console.log(
          '   💡 Next time this restaurant is opened, data will be instant (no Google API call)',
        );
      } else {
        console.log('   ❌ Failed to fetch from Google Places');
      }
    } else {
      console.log('\n   ✅ Restaurant already has complete data - no fetch needed');
      console.log('   ⚡ Would return instantly (< 100ms)');
    }
  } catch (error) {
    console.error('\n❌ Lazy load test failed:', error.message);
    console.error(error);
  }
}

async function runTests() {
  console.log('\n🚀 Starting nearYou + Lazy Load Test Suite');
  console.log(`📅 ${new Date().toLocaleString()}\n`);

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Test 1: nearYou flow
    const restaurants = await testNearYouFlow();

    // Test 2: Lazy load details
    await testLazyLoadDetails(restaurants);

    console.log('\n\n✅ All tests completed!');
    console.log('='.repeat(70));
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
  } finally {
    await sequelize.close();
    console.log('\n👋 Database connection closed');
  }
}

// Run tests
runTests();
