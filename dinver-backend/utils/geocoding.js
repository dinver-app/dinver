const axios = require('axios');

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const GEOCODING_BASE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

/**
 * Get city coordinates using Google Geocoding API
 * @param {string} cityName - Name of the city (e.g., "Zagreb", "Osijek")
 * @param {string} country - Country code or name (default: "Croatia")
 * @returns {Promise<Object>} Object with latitude and longitude
 */
async function getCityCoordinates(cityName, country = 'Croatia') {
  try {
    if (!GOOGLE_API_KEY) {
      console.warn('GOOGLE_PLACES_API_KEY not set, using fallback coordinates');
      return null;
    }

    const address = `${cityName}, ${country}`;
    const response = await axios.get(GEOCODING_BASE_URL, {
      params: {
        address: address,
        key: GOOGLE_API_KEY,
      },
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
      };
    }

    console.warn(`No coordinates found for ${address}`);
    return null;
  } catch (error) {
    console.error(`Error fetching coordinates for ${cityName}:`, error.message);
    return null;
  }
}

/**
 * Get coordinates for multiple cities with caching
 * @param {Array<string>} cityNames - Array of city names
 * @param {string} country - Country code or name (default: "Croatia")
 * @returns {Promise<Map>} Map of city names to coordinates
 */
async function getCitiesCoordinates(cityNames, country = 'Croatia') {
  const coordinatesMap = new Map();

  // Process cities in parallel with rate limiting
  const batchSize = 5;
  for (let i = 0; i < cityNames.length; i += batchSize) {
    const batch = cityNames.slice(i, i + batchSize);
    const promises = batch.map(async (cityName) => {
      const coords = await getCityCoordinates(cityName, country);
      if (coords) {
        coordinatesMap.set(cityName, coords);
      }
    });

    await Promise.all(promises);

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < cityNames.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return coordinatesMap;
}

module.exports = {
  getCityCoordinates,
  getCitiesCoordinates,
};
