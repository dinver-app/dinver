require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const path = require('path');
const { Restaurant } = require('../models');

/**
 * Generate a unique slug for restaurant name
 * @param {string} name - Restaurant name
 * @returns {string} - Unique slug
 */
async function generateSlug(name) {
  const normalizedName = name
    .toLowerCase()
    .trim()
    .replace(/[čć]/g, 'c')
    .replace(/[š]/g, 's')
    .replace(/[ž]/g, 'z')
    .replace(/[đ]/g, 'd')
    .replace(/[^\w\s-]/g, '');

  const baseSlug = normalizedName
    .replace(/[\s]+/g, '-')
    .replace(/[^\w\-]+/g, '');

  let slug = baseSlug;
  let suffix = 1;

  while (await Restaurant.findOne({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

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

      // Clean opening hours JSON - convert to expected format
      let cleanOpeningHours = null;
      if (entry.opening_hours) {
        cleanOpeningHours = {
          open_now: entry.opening_hours.open_now,
          periods: [],
          weekday_text: entry.opening_hours.weekday_text || [],
        };

        // Convert periods to the expected format if they exist
        if (
          entry.opening_hours.periods &&
          entry.opening_hours.periods.length > 0
        ) {
          // Filter out periods with empty or invalid times
          const validPeriods = entry.opening_hours.periods.filter(
            (period) =>
              period.open &&
              period.close &&
              period.open.time &&
              period.close.time &&
              period.open.time !== '' &&
              period.close.time !== '' &&
              period.open.day !== undefined &&
              period.close.day !== undefined,
          );

          if (validPeriods.length > 0) {
            cleanOpeningHours.periods = validPeriods.map((period) => ({
              open: {
                day: period.open.day,
                time: period.open.time,
              },
              close: {
                day: period.close.day,
                time: period.close.time,
              },
              shifts: period.shifts || [],
            }));
          } else {
            // If no valid periods, set periods to empty array
            cleanOpeningHours.periods = [];
            console.log(
              '⚠️  No valid opening hours periods found, setting to empty array',
            );
          }
        }
      }

      const dbData = {
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
        types: entry.types || null,
        phone: entry.phone,
        websiteUrl: entry.website,
      };

      // Only add openingHours if we have valid data
      if (cleanOpeningHours && cleanOpeningHours.periods.length > 0) {
        // Store as JSON object, not string
        dbData.openingHours = cleanOpeningHours;
        console.log('✅ Opening hours saved as JSON object');
      } else {
        console.log('ℹ️  Skipping opening hours - no valid data available');
      }

      if (existingRestaurant) {
        if (updateIfExists) {
          // Generate slug for existing restaurant
          const slug = await generateSlug(entry.name);
          await existingRestaurant.update({
            ...dbData,
            slug: slug,
          });
          console.log(
            `Updated restaurant with place_id: ${entry.place_id} (slug: ${slug})`,
          );
        } else {
          console.log(
            `Restaurant with place_id: ${entry.place_id} already exists. Skipping...`,
          );
        }
      } else {
        // Generate slug for new restaurant
        const slug = await generateSlug(entry.name);
        await Restaurant.create({
          ...dbData,
          slug: slug,
        });
        console.log(
          `Added new restaurant with place_id: ${entry.place_id} (slug: ${slug})`,
        );
      }
    }
    console.log('Database operation completed successfully!');
  } catch (error) {
    console.error('Error populating database:', error);
  }
}

// Run the function with updateIfExists flag
// populateDatabase(true); // This line is now handled by the command line interface
