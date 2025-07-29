require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Google Places API configuration
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const BASE_URL = 'https://maps.googleapis.com/maps/api/place';

/**
 * Fetch restaurant details from Google Places API
 * @param {string} placeId - Google Place ID
 * @returns {Object} Restaurant data
 */
async function fetchRestaurantDetails(placeId) {
  try {
    console.log(`Fetching details for place_id: ${placeId}`);

    // First, get place details
    const detailsUrl = `${BASE_URL}/details/json`;
    const detailsResponse = await axios.get(detailsUrl, {
      params: {
        place_id: placeId,
        fields:
          'name,formatted_address,geometry,rating,user_ratings_total,price_level,opening_hours,types,icon,photos,business_status,icon_background_color,icon_mask_base_uri,plus_code,website,formatted_phone_number,international_phone_number,reviews,url,vicinity',
        key: GOOGLE_API_KEY,
      },
    });

    if (detailsResponse.data.status !== 'OK') {
      throw new Error(`Google API error: ${detailsResponse.data.status}`);
    }

    const place = detailsResponse.data.result;

    // Transform data to match our database schema
    const restaurantData = {
      place_id: placeId,
      name: place.name,
      vicinity: place.vicinity || place.formatted_address,
      geometry: {
        location: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
        },
      },
      rating: place.rating,
      user_ratings_total: place.user_ratings_total,
      price_level: place.price_level,
      opening_hours: place.opening_hours,
      types: place.types,
      icon: place.icon,
      photos: place.photos,
      business_status: place.business_status,
      icon_background_color: place.icon_background_color,
      icon_mask_base_uri: place.icon_mask_base_uri,
      plus_code: place.plus_code,
      website: place.website,
      phone: place.formatted_phone_number || place.international_phone_number,
      reviews: place.reviews,
      url: place.url,
    };

    return restaurantData;
  } catch (error) {
    console.error('Error fetching restaurant details:', error.message);
    throw error;
  }
}

/**
 * Save restaurant data to JSON file with timestamp
 * @param {Object} restaurantData - Restaurant data to save
 */
function saveToJsonFile(restaurantData) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `restaurants_${timestamp}.json`;
  const filepath = path.join(__dirname, '../data', filename);

  // Ensure data directory exists
  const dataDir = path.dirname(filepath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(filepath, JSON.stringify([restaurantData], null, 2));
  console.log(`Restaurant data saved to: ${filepath}`);
  return filepath;
}

/**
 * Generate a unique slug for restaurant name
 * @param {string} name - Restaurant name
 * @returns {string} - Unique slug
 */
async function generateSlug(name) {
  const { Restaurant } = require('../models');

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

/**
 * Insert restaurant into database
 * @param {Object} restaurantData - Restaurant data to insert
 * @param {boolean} updateIfExists - Whether to update if restaurant already exists
 * @param {boolean} forceUpdate - Whether to force update existing restaurant
 */
async function insertIntoDatabase(
  restaurantData,
  updateIfExists = false,
  forceUpdate = false,
) {
  try {
    // Test database connection and show which database we're connected to
    const { Restaurant, sequelize } = require('../models');

    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Get database info
    const dbName = sequelize.getDatabaseName();
    const dbHost = sequelize.config.host;
    console.log(`📊 Connected to database: ${dbName} on ${dbHost}`);

    const existingRestaurant = await Restaurant.findOne({
      where: { placeId: restaurantData.place_id },
    });

    // Extract place (city) from address - take the last part after comma
    const addressParts = restaurantData.vicinity.split(',');
    const place = addressParts[addressParts.length - 1].trim();

    // Clean opening hours JSON - convert to expected format
    let cleanOpeningHours = null;
    if (restaurantData.opening_hours) {
      console.log(
        '🔍 Raw opening hours from API:',
        JSON.stringify(restaurantData.opening_hours, null, 2),
      );

      cleanOpeningHours = {
        open_now: restaurantData.opening_hours.open_now,
        periods: [],
        weekday_text: restaurantData.opening_hours.weekday_text || [],
      };

      // Convert periods to the expected format if they exist
      if (
        restaurantData.opening_hours.periods &&
        restaurantData.opening_hours.periods.length > 0
      ) {
        console.log(
          '📅 Processing periods:',
          restaurantData.opening_hours.periods.length,
          'periods found',
        );

        // Filter out periods with empty or invalid times
        const validPeriods = restaurantData.opening_hours.periods.filter(
          (period) => {
            const isValid =
              period.open &&
              period.close &&
              period.open.time &&
              period.close.time &&
              period.open.time !== '' &&
              period.close.time !== '' &&
              period.open.day !== undefined &&
              period.close.day !== undefined;

            if (!isValid) {
              console.log('❌ Invalid period found:', period);
            }
            return isValid;
          },
        );

        console.log('✅ Valid periods:', validPeriods.length);

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
      } else {
        console.log('⚠️  No periods found in opening_hours');
      }
    } else {
      console.log('⚠️  No opening_hours data available');
    }

    const dbData = {
      name: restaurantData.name,
      placeId: restaurantData.place_id,
      address: restaurantData.vicinity,
      place: place,
      latitude: restaurantData.geometry.location.lat,
      longitude: restaurantData.geometry.location.lng,
      rating: restaurantData.rating,
      userRatingsTotal: restaurantData.user_ratings_total,
      priceLevel: restaurantData.price_level,
      isOpenNow: restaurantData.opening_hours
        ? restaurantData.opening_hours.open_now
        : null,
      types: restaurantData.types || null,
      phone: restaurantData.phone,
      websiteUrl: restaurantData.website,
    };

    // Only add openingHours if we have valid data
    if (cleanOpeningHours && cleanOpeningHours.periods.length > 0) {
      // Store as JSON object, not string
      dbData.openingHours = cleanOpeningHours;
      console.log('✅ Opening hours saved as JSON object');
    } else {
      console.log('ℹ️  Skipping opening hours - no valid data available');
    }

    // Generate slug for the restaurant
    const slug = await generateSlug(restaurantData.name);
    dbData.slug = slug;
    console.log(`🔗 Generated slug: ${slug}`);

    // Log opening hours format for debugging
    if (cleanOpeningHours) {
      console.log(
        `🕒 Opening hours format: ${JSON.stringify(cleanOpeningHours).substring(0, 100)}...`,
      );
    }

    if (existingRestaurant) {
      if (updateIfExists || forceUpdate) {
        await existingRestaurant.update(dbData);
        console.log(
          `Updated restaurant with place_id: ${restaurantData.place_id}`,
        );

        // Verify how it was stored
        const updatedRestaurant = await Restaurant.findOne({
          where: { placeId: restaurantData.place_id },
        });
        console.log(
          `📊 Stored opening hours type: ${typeof updatedRestaurant.openingHours}`,
        );
        if (updatedRestaurant.openingHours) {
          console.log(
            `📊 Stored opening hours preview: ${JSON.stringify(updatedRestaurant.openingHours).substring(0, 100)}...`,
          );
        }
      } else {
        console.log(
          `Restaurant with place_id: ${restaurantData.place_id} already exists. Skipping...`,
        );
        console.log('💡 Use --update or --force to update existing restaurant');
        return;
      }
    } else {
      await Restaurant.create(dbData);
      console.log(
        `Added new restaurant with place_id: ${restaurantData.place_id}`,
      );

      // Verify how it was stored
      const newRestaurant = await Restaurant.findOne({
        where: { placeId: restaurantData.place_id },
      });
      console.log(
        `📊 Stored opening hours type: ${typeof newRestaurant.openingHours}`,
      );
      if (newRestaurant.openingHours) {
        console.log(
          `📊 Stored opening hours preview: ${JSON.stringify(newRestaurant.openingHours).substring(0, 100)}...`,
        );
      }
    }
  } catch (error) {
    console.error('Error inserting into database:', error);
    throw error;
  }
}

/**
 * Main function to fetch and process restaurant
 * @param {string} placeId - Google Place ID
 * @param {boolean} saveToJson - Whether to save to JSON file
 * @param {boolean} insertToDb - Whether to insert into database
 * @param {boolean} updateIfExists - Whether to update if restaurant already exists
 * @param {boolean} forceUpdate - Whether to force update existing restaurant
 * @param {string} jsonFile - Optional JSON file to load data from instead of API
 */
async function fetchAndProcessRestaurant(
  placeId,
  saveToJson = false,
  insertToDb = false,
  updateIfExists = false,
  forceUpdate = false,
  jsonFile = null,
) {
  try {
    console.log('=== Restaurant Fetcher ===');
    console.log(`Place ID: ${placeId}`);
    console.log(`Save to JSON: ${saveToJson}`);
    console.log(`Insert to DB: ${insertToDb}`);
    console.log(`Update if exists: ${updateIfExists}`);
    console.log(`Force update: ${forceUpdate}`);
    if (jsonFile) {
      console.log(`Load from JSON: ${jsonFile}`);
    }
    console.log('');

    // Check if API key is available
    if (!GOOGLE_API_KEY && !jsonFile) {
      throw new Error('GOOGLE_PLACES_API_KEY environment variable is required');
    }

    // Fetch restaurant data
    let restaurantData;
    if (jsonFile) {
      // Load from JSON file
      const fs = require('fs');
      const path = require('path');
      const jsonPath = path.join(__dirname, '../data', jsonFile);

      if (!fs.existsSync(jsonPath)) {
        throw new Error(`JSON file not found: ${jsonPath}`);
      }

      const jsonContent = fs.readFileSync(jsonPath, 'utf8');
      const jsonData = JSON.parse(jsonContent);

      if (jsonData.length > 0) {
        restaurantData = jsonData[0]; // Take first restaurant from array
        console.log(`📁 Loaded restaurant data from: ${jsonFile}`);
      } else {
        throw new Error('No restaurant data found in JSON file');
      }
    } else {
      // Fetch from API
      restaurantData = await fetchRestaurantDetails(placeId);
    }

    // Display fetched data
    console.log('=== Fetched Restaurant Data ===');
    console.log(`Name: ${restaurantData.name}`);
    console.log(`Address: ${restaurantData.vicinity}`);
    console.log(
      `Rating: ${restaurantData.rating} (${restaurantData.user_ratings_total} reviews)`,
    );
    console.log(`Price Level: ${restaurantData.price_level}`);
    console.log(`Types: ${restaurantData.types?.slice(0, 5).join(', ')}`);
    console.log(`Business Status: ${restaurantData.business_status}`);
    console.log('');

    // Save to JSON file if requested
    if (saveToJson) {
      const jsonFilepath = saveToJsonFile(restaurantData);
      console.log(`✅ Restaurant data saved to: ${jsonFilepath}`);
    }

    // Insert into database if requested
    if (insertToDb) {
      await insertIntoDatabase(restaurantData, updateIfExists, forceUpdate);
      console.log('✅ Restaurant inserted/updated in database');
    }

    console.log('=== Operation completed successfully! ===');

    return restaurantData;
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node fetchSingleRestaurant.js <place_id> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --save-json   Save to JSON file (optional)');
    console.log('  --insert-db   Insert into database');
    console.log('  --update      Update if restaurant exists in database');
    console.log('  --force       Force update even if restaurant exists');
    console.log('  --prod        Use production database');
    console.log('  --json <file> Load restaurant data from a JSON file');
    console.log('');
    console.log('Examples:');
    console.log('  node fetchSingleRestaurant.js ChIJN1t_tDeuEmsRUsoyG83frY4');
    console.log(
      '  node fetchSingleRestaurant.js ChIJN1t_tDeuEmsRUsoyG83frY4 --insert-db',
    );
    console.log(
      '  node fetchSingleRestaurant.js ChIJN1t_tDeuEmsRUsoyG83frY4 --insert-db --update',
    );
    console.log(
      '  node fetchSingleRestaurant.js ChIJN1t_tDeuEmsRUsoyG83frY4 --insert-db --prod',
    );
    console.log(
      '  node fetchSingleRestaurant.js ChIJN1t_tDeuEmsRUsoyG83frY4 --save-json --insert-db --prod',
    );
    console.log(
      '  node fetchSingleRestaurant.js ChIJN1t_tDeuEmsRUsoyG83frY4 --json restaurants_2023-10-27T10-30-00.json',
    );
    process.exit(1);
  }

  const placeId = args[0];
  const saveToJson = args.includes('--save-json'); // Changed from --no-json to --save-json
  const insertToDb = args.includes('--insert-db');
  const updateIfExists = args.includes('--update');
  const forceUpdate = args.includes('--force');
  const useProd = args.includes('--prod');
  const jsonFile = args.find((arg) => arg.startsWith('--json='));
  const jsonFileName = jsonFile ? jsonFile.split('=')[1] : null;

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
    console.log(
      `📊 Database URL: ${process.env.DATABASE_URL.substring(0, 50)}...`,
    );
    console.log(`🔧 NODE_ENV: ${process.env.NODE_ENV}`);
  } else {
    console.log('🏠 Using local database...');
    console.log(`🔧 NODE_ENV: ${process.env.NODE_ENV}`);
  }

  fetchAndProcessRestaurant(
    placeId,
    saveToJson,
    insertToDb,
    updateIfExists,
    forceUpdate,
    jsonFileName,
  );
}

module.exports = {
  fetchAndProcessRestaurant,
  fetchRestaurantDetails,
  saveToJsonFile,
  insertIntoDatabase,
};
