require('dotenv').config({ path: '../.env' });
const axios = require('axios');

// Google Places API configuration
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const BASE_URL = 'https://maps.googleapis.com/maps/api/place';

/**
 * Search for restaurants using Google Places API
 * @param {string} query - Search query (restaurant name or address)
 * @param {number} maxResults - Maximum number of results to return
 * @returns {Array} Array of restaurant data
 */
async function searchRestaurants(query, maxResults = 5) {
  try {
    console.log(`Searching for: "${query}"`);

    // Search for places
    const searchUrl = `${BASE_URL}/textsearch/json`;
    const searchResponse = await axios.get(searchUrl, {
      params: {
        query: query,
        type: 'restaurant',
        key: GOOGLE_API_KEY,
      },
    });

    if (
      searchResponse.data.status !== 'OK' &&
      searchResponse.data.status !== 'ZERO_RESULTS'
    ) {
      throw new Error(`Google API error: ${searchResponse.data.status}`);
    }

    if (searchResponse.data.status === 'ZERO_RESULTS') {
      console.log('No restaurants found for this query.');
      return [];
    }

    const places = searchResponse.data.results.slice(0, maxResults);

    // Get detailed information for each place
    const detailedPlaces = [];

    for (const place of places) {
      try {
        const detailsUrl = `${BASE_URL}/details/json`;
        const detailsResponse = await axios.get(detailsUrl, {
          params: {
            place_id: place.place_id,
            fields:
              'name,formatted_address,geometry,rating,user_ratings_total,price_level,opening_hours,types,icon,photos,business_status,icon_background_color,icon_mask_base_uri,plus_code,website,formatted_phone_number,international_phone_number,reviews,url,vicinity',
            key: GOOGLE_API_KEY,
          },
        });

        if (detailsResponse.data.status === 'OK') {
          const detailedPlace = detailsResponse.data.result;
          detailedPlaces.push({
            place_id: place.place_id,
            name: detailedPlace.name,
            vicinity: detailedPlace.vicinity || detailedPlace.formatted_address,
            rating: detailedPlace.rating,
            user_ratings_total: detailedPlace.user_ratings_total,
            price_level: detailedPlace.price_level,
            business_status: detailedPlace.business_status,
            types: detailedPlace.types,
            phone:
              detailedPlace.formatted_phone_number ||
              detailedPlace.international_phone_number,
            website: detailedPlace.website,
            geometry: detailedPlace.geometry,
            opening_hours: detailedPlace.opening_hours,
            photos: detailedPlace.photos,
          });
        }
      } catch (error) {
        console.log(
          `Error fetching details for ${place.name}: ${error.message}`,
        );
      }
    }

    return detailedPlaces;
  } catch (error) {
    console.error('Error searching restaurants:', error.message);
    throw error;
  }
}

/**
 * Display search results in a formatted way
 * @param {Array} restaurants - Array of restaurant data
 */
function displaySearchResults(restaurants) {
  if (restaurants.length === 0) {
    console.log('No restaurants found.');
    return;
  }

  console.log('\n=== Search Results ===');
  console.log(`Found ${restaurants.length} restaurant(s):\n`);

  restaurants.forEach((restaurant, index) => {
    console.log(`${index + 1}. ${restaurant.name}`);
    console.log(`   Place ID: ${restaurant.place_id}`);
    console.log(`   Address: ${restaurant.vicinity}`);
    console.log(
      `   Rating: ${restaurant.rating || 'N/A'} (${restaurant.user_ratings_total || 0} reviews)`,
    );
    console.log(
      `   Price Level: ${restaurant.price_level ? '💰'.repeat(restaurant.price_level) : 'N/A'}`,
    );
    console.log(`   Status: ${restaurant.business_status}`);
    console.log(`   Phone: ${restaurant.phone || 'N/A'}`);
    console.log(`   Website: ${restaurant.website || 'N/A'}`);
    console.log(
      `   Types: ${restaurant.types?.slice(0, 3).join(', ') || 'N/A'}`,
    );
    console.log('');
  });

  console.log('=== Copy Place ID ===');
  console.log(
    'To fetch detailed data for a restaurant, copy its Place ID and run:',
  );
  console.log('node fetchSingleRestaurant.js <place_id>');
  console.log('');
}

/**
 * Main function to search restaurants
 * @param {string} query - Search query
 * @param {number} maxResults - Maximum number of results
 */
async function searchAndDisplayRestaurants(query, maxResults = 5) {
  try {
    console.log('=== Restaurant Search ===');
    console.log(`Query: "${query}"`);
    console.log(`Max Results: ${maxResults}`);
    console.log('');

    // Check if API key is available
    if (!GOOGLE_API_KEY) {
      throw new Error('GOOGLE_PLACES_API_KEY environment variable is required');
    }

    // Search for restaurants
    const restaurants = await searchRestaurants(query, maxResults);

    // Display results
    displaySearchResults(restaurants);

    return restaurants;
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(
      'Usage: node searchRestaurants.js <search_query> [max_results] [options]',
    );
    console.log('');
    console.log('Arguments:');
    console.log('  search_query   Restaurant name or address to search for');
    console.log('  max_results    Maximum number of results (default: 5)');
    console.log('');
    console.log('Options:');
    console.log('  --prod        Use production database (for future use)');
    console.log('');
    console.log('Examples:');
    console.log('  node searchRestaurants.js "Pizza Zagreb"');
    console.log('  node searchRestaurants.js "Restaurant Split" 10');
    console.log('  node searchRestaurants.js "Cafe Dubrovnik" 3 --prod');
    process.exit(1);
  }

  const searchQuery = args[0];
  const maxResults = parseInt(args[1]) || 5;
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

  searchAndDisplayRestaurants(searchQuery, maxResults);
}

module.exports = {
  searchRestaurants,
  searchAndDisplayRestaurants,
  displaySearchResults,
};
