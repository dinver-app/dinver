const fs = require('fs');
const path = require('path');
const { Restaurant } = require('../models');

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
            openingHours: entry.opening_hours || null,
            types: entry.types || null,
            iconUrl: entry.icon,
            photoReference:
              entry.photos && entry.photos.length > 0
                ? entry.photos[0].photo_reference
                : null,
            vicinity: entry.vicinity,
            businessStatus: entry.business_status,
            geometry: entry.geometry,
            iconBackgroundColor: entry.icon_background_color,
            iconMaskBaseUri: entry.icon_mask_base_uri,
            photos: entry.photos || null,
            plusCode: entry.plus_code || null,
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
          latitude: entry.geometry.location.lat,
          longitude: entry.geometry.location.lng,
          rating: entry.rating,
          userRatingsTotal: entry.user_ratings_total,
          priceLevel: entry.price_level,
          isOpenNow: entry.opening_hours ? entry.opening_hours.open_now : null,
          openingHours: entry.opening_hours || null,
          types: entry.types || null,
          iconUrl: entry.icon,
          photoReference:
            entry.photos && entry.photos.length > 0
              ? entry.photos[0].photo_reference
              : null,
          vicinity: entry.vicinity,
          businessStatus: entry.business_status,
          geometry: entry.geometry,
          iconBackgroundColor: entry.icon_background_color,
          iconMaskBaseUri: entry.icon_mask_base_uri,
          photos: entry.photos || null,
          plusCode: entry.plus_code || null,
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
populateDatabase(true);
