require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const path = require('path');
const { Restaurant } = require('../models');

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node populateRestaurants.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --update      Update if restaurant exists in database');
    console.log('  --prod        Use production database');
    console.log('');
    console.log('Examples:');
    console.log('  node populateRestaurants.js');
    console.log('  node populateRestaurants.js --update');
    console.log('  node populateRestaurants.js --prod');
    console.log('  node populateRestaurants.js --update --prod');
    process.exit(1);
  }

  const updateIfExists = args.includes('--update');
  const useProd = args.includes('--prod');

  // Set production database URL if requested
  if (useProd) {
    // Check if production database URL is set in environment
    if (!process.env.DATABASE_URL_PROD) {
      console.error('❌ Error: DATABASE_URL_PROD environment variable not set');
      console.log('Please add DATABASE_URL_PROD to your .env file:');
      console.log(
        'DATABASE_URL_PROD=postgres://username:password@host:port/database',
      );
      process.exit(1);
    }

    process.env.DATABASE_URL = process.env.DATABASE_URL_PROD;
    process.env.NODE_ENV = 'production';
    console.log('🌐 Using production database...');
  }

  // Load JSON data
  const dataPath = path.join(__dirname, '../data/restaurants.json');
  const jsonData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  populateDatabase(updateIfExists);
}

// Load JSON data
const dataPath = path.join(__dirname, '../data/restaurants.json');
const jsonData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Function to populate the database
async function populateDatabase(updateIfExists = false) {
  try {
    // Limit to first two entries
    // const limitedData = jsonData.slice(0, 2);

    for (const entry of jsonData) {
      const existingRestaurant = await Restaurant.findOne({
        where: { place_id: entry.place_id },
      });

      // Extract place (city) from address - take the last part after comma
      const addressParts = entry.vicinity.split(',');
      const place = addressParts[addressParts.length - 1].trim();

      // Clean opening hours JSON
      const cleanOpeningHours = entry.opening_hours
        ? {
            open_now: entry.opening_hours.open_now,
            periods: entry.opening_hours.periods || [],
            weekday_text: entry.opening_hours.weekday_text || [],
          }
        : null;

      if (existingRestaurant) {
        if (updateIfExists) {
          await existingRestaurant.update({
            name: entry.name,
            address: entry.vicinity,
            latitude: entry.geometry.location.lat,
            longitude: entry.geometry.location.lng,
            rating: entry.rating,
            userRatingsTotal: entry.user_ratings_total,
            priceLevel: entry.price_level,
            isOpenNow: entry.opening_hours
              ? entry.opening_hours.open_now
              : null,
            openingHours: cleanOpeningHours
              ? JSON.stringify(cleanOpeningHours)
              : null,
            types: entry.types || null,
            iconUrl: entry.icon,
            photoReference:
              entry.photos && entry.photos.length > 0
                ? entry.photos[0].photo_reference
                : null,
            vicinity: entry.vicinity,
            businessStatus: entry.business_status,
            geometry: cleanGeometry ? JSON.stringify(cleanGeometry) : null,
            iconBackgroundColor: entry.icon_background_color,
            iconMaskBaseUri: entry.icon_mask_base_uri,

            plusCode: cleanPlusCode ? JSON.stringify(cleanPlusCode) : null,
          });
          console.log(`Updated restaurant with place_id: ${entry.place_id}`);
        } else {
          console.log(
            `Restaurant with place_id: ${entry.place_id} already exists. Skipping...`,
          );
        }
      } else {
        await Restaurant.create({
          name: entry.name,
          placeId: entry.place_id,
          address: entry.vicinity,
          place: place,
          latitude: entry.geometry.location.lat,
          longitude: entry.geometry.location.lng,
          rating: entry.rating,
          userRatingsTotal: entry.user_ratings_total,
          priceLevel: entry.price_level,
          isOpenNow: entry.opening_hours ? entry.opening_hours.open_now : null,
          openingHours: cleanOpeningHours
            ? JSON.stringify(cleanOpeningHours)
            : null,
          types: entry.types || null,
          phone: entry.phone,
          websiteUrl: entry.website,
        });
        console.log(`Added new restaurant with place_id: ${entry.place_id}`);
      }
    }
    console.log('Database operation completed successfully!');
  } catch (error) {
    console.error('Error populating database:', error);
  }
}

// Run the function with updateIfExists flag
// populateDatabase(true); // This line is now handled by the command line interface
