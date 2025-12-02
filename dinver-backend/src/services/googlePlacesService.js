const axios = require('axios');
const { Restaurant } = require('../../models');

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || GOOGLE_PLACES_API_KEY;

/**
 * Parse various Google Maps URL formats to extract Place ID
 * Supports:
 * - Share links: https://maps.app.goo.gl/xxxxx
 * - Place URLs: https://www.google.com/maps/place/...
 * - Search URLs: https://www.google.com/maps/search/...
 * - Direct URLs with place ID: ...?place_id=ChIJ...
 */
async function extractPlaceIdFromUrl(url) {
  try {
    // Direct Place ID in URL
    const placeIdMatch = url.match(/place_id=([^&]+)/);
    if (placeIdMatch) {
      return placeIdMatch[1];
    }

    // Shortened goo.gl link - follow redirects
    if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
      console.log('Processing shortened URL:', url);

      const response = await axios.get(url, {
        maxRedirects: 10,
        validateStatus: () => true, // Accept all status codes
      });

      // Try multiple ways to get the final URL
      const finalUrl = response.request?.res?.responseUrl ||
                      response.request?.path ||
                      response.config?.url ||
                      url;

      console.log('Final URL after redirect:', finalUrl);
      console.log('Response data preview:', response.data?.substring?.(0, 500));

      // Extract from final URL - place_id parameter
      const finalPlaceIdMatch = finalUrl.match(/place_id=([^&]+)/);
      if (finalPlaceIdMatch) {
        console.log('Found place_id in URL:', finalPlaceIdMatch[1]);
        return finalPlaceIdMatch[1];
      }

      // Try to extract from HTML response body (for redirected pages)
      if (response.data && typeof response.data === 'string') {
        // Look for place_id in meta tags or links
        const htmlPlaceIdMatch = response.data.match(/place_id=([A-Za-z0-9_-]+)/);
        if (htmlPlaceIdMatch) {
          console.log('Found place_id in HTML:', htmlPlaceIdMatch[1]);
          return htmlPlaceIdMatch[1];
        }

        // Look for /maps/place/ pattern with Place ID
        const htmlPlaceMatch = response.data.match(/\/maps\/place\/[^"']*\/([A-Za-z0-9_-]{27,})/);
        if (htmlPlaceMatch) {
          console.log('Found place ID in maps URL:', htmlPlaceMatch[1]);
          return htmlPlaceMatch[1];
        }
      }

      // Try to extract from data-place-id attribute
      const dataMatch = finalUrl.match(/data-place-id="([^"]+)"/);
      if (dataMatch) {
        console.log('Found data-place-id:', dataMatch[1]);
        return dataMatch[1];
      }

      // Try to extract place name from URL and use Text Search
      const placeNameMatch = finalUrl.match(/\/place\/([^/@]+)/);
      if (placeNameMatch) {
        // Decode URL-encoded place name
        const encodedName = placeNameMatch[1];
        const placeName = decodeURIComponent(encodedName.replace(/\+/g, ' '));
        console.log('Found place name in URL:', placeName);

        // Use Text Search to find the place
        try {
          const searchResults = await searchPlacesByText(placeName);
          if (searchResults && searchResults.length > 0) {
            const firstResult = searchResults[0];
            console.log('Found place via Text Search:', firstResult.placeId, firstResult.name);
            return firstResult.placeId;
          }
        } catch (searchError) {
          console.error('Text Search failed, falling back to coordinates:', searchError);
        }
      }

      // Fallback: Extract coordinates from URL format
      const placeCoordMatch = finalUrl.match(/\/place\/[^/]+\/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (placeCoordMatch) {
        const lat = placeCoordMatch[1];
        const lng = placeCoordMatch[2];
        console.log('Using coordinates as fallback:', lat, lng);
        return await getPlaceIdFromCoordinates(lat, lng);
      }
    }

    // Standard /place/ URL format
    const standardPlaceMatch = url.match(/\/place\/[^/]+\/.*@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (standardPlaceMatch) {
      const lat = standardPlaceMatch[1];
      const lng = standardPlaceMatch[2];

      // Use Geocoding API to find Place ID from coordinates
      return await getPlaceIdFromCoordinates(lat, lng);
    }

    throw new Error('Could not extract Place ID from URL');
  } catch (error) {
    console.error('Error extracting Place ID:', error);
    throw new Error(`Failed to extract Place ID: ${error.message}`);
  }
}

/**
 * Get Place ID from coordinates using Geocoding API
 */
async function getPlaceIdFromCoordinates(lat, lng) {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        latlng: `${lat},${lng}`,
        key: GOOGLE_MAPS_API_KEY,
      },
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      // Find the most specific result (usually first one)
      const result = response.data.results.find(r =>
        r.types.includes('restaurant') ||
        r.types.includes('food') ||
        r.types.includes('establishment')
      ) || response.data.results[0];

      return result.place_id;
    }

    throw new Error('No place found at coordinates');
  } catch (error) {
    console.error('Error getting Place ID from coordinates:', error);
    throw error;
  }
}

/**
 * Search for places by text query
 */
async function searchPlacesByText(query, lat = null, lng = null) {
  try {
    const params = {
      query,
      key: GOOGLE_PLACES_API_KEY,
      type: 'restaurant',
    };

    // Add location bias if coordinates provided
    if (lat && lng) {
      params.location = `${lat},${lng}`;
      params.radius = 10000; // 10km radius
    }

    const response = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
      params,
    });

    console.log('Google Places API status:', response.data.status);
    console.log('Number of results:', response.data.results?.length || 0);

    // Handle different API statuses
    if (response.data.status === 'ZERO_RESULTS') {
      return []; // Return empty array for no results
    }

    if (response.data.status === 'REQUEST_DENIED') {
      console.error('Google Places API - REQUEST_DENIED:', response.data.error_message);
      throw new Error(`Google Places API access denied. Check your API key and enabled APIs. ${response.data.error_message || ''}`);
    }

    if (response.data.status !== 'OK') {
      console.error('Google Places API error:', response.data.status, response.data.error_message);
      throw new Error(`Google Places API error: ${response.data.status}. ${response.data.error_message || ''}`);
    }

    // Return up to 10 results
    const results = response.data.results.slice(0, 10).map(place => {
      // Extract city/place from address
      const addressParts = place.formatted_address ? place.formatted_address.split(',') : [];
      const place_name = addressParts.length > 1 ? addressParts[addressParts.length - 2].trim() : '';

      const photoReference = place.photos?.[0]?.photo_reference;
      const photoUrl = photoReference
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${GOOGLE_MAPS_API_KEY}`
        : null;

      return {
        placeId: place.place_id,
        name: place.name,
        address: place.formatted_address,
        place: place_name, // City/town
        rating: place.rating,
        userRatingsTotal: place.user_ratings_total,
        types: place.types,
        photoReference: photoReference,
        photoUrl: photoUrl,
        location: place.geometry.location,
      };
    });

    console.log(`Returning ${results.length} results`);
    return results;
  } catch (error) {
    console.error('Error searching places:', error);
    throw error;
  }
}

/**
 * Get detailed place information from Google Places API
 */
async function getPlaceDetails(placeId) {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        place_id: placeId,
        key: GOOGLE_PLACES_API_KEY,
        fields: [
          'place_id',
          'name',
          'formatted_address',
          'address_components',
          'geometry',
          'formatted_phone_number',
          'international_phone_number',
          'opening_hours',
          'website',
          'rating',
          'user_ratings_total',
          'price_level',
          'photos',
          'types',
          'url',
          'vicinity',
          'business_status',
          'icon',
          'icon_background_color',
          'icon_mask_base_uri',
          'plus_code',
        ].join(','),
      },
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Google Places API error: ${response.data.status}`);
    }

    const result = response.data.result;
    return result;
  } catch (error) {
    console.error('Error fetching place details:', error);
    throw error;
  }
}

/**
 * Country calling code mapping for European countries
 */
const COUNTRY_CALLING_CODES = {
  'Slovenia': '+386',
  'Italy': '+39',
  'Austria': '+43',
  'Germany': '+49',
  'Switzerland': '+41',
  'France': '+33',
  'Spain': '+34',
  'Portugal': '+351',
  'Greece': '+30',
  'Belgium': '+32',
  'Netherlands': '+31',
  'Poland': '+48',
  'Czech Republic': '+420',
  'Slovakia': '+421',
  'Hungary': '+36',
  'Romania': '+40',
  'Bulgaria': '+359',
  'Serbia': '+381',
  'Bosnia and Herzegovina': '+387',
  'Montenegro': '+382',
  'North Macedonia': '+389',
  'Albania': '+355',
  'Kosovo': '+383',
  'United Kingdom': '+44',
  'Ireland': '+353',
  'Denmark': '+45',
  'Sweden': '+46',
  'Norway': '+47',
  'Finland': '+358',
  'Iceland': '+354',
  'Luxembourg': '+352',
  'Malta': '+356',
  'Cyprus': '+357',
  'Estonia': '+372',
  'Latvia': '+371',
  'Lithuania': '+370',
  'Ukraine': '+380',
  'Moldova': '+373',
  'Belarus': '+375',
  'Turkey': '+90',
};

/**
 * Format phone number with international prefix based on country
 * @param {string} phone - The phone number (may be local or international)
 * @param {string} country - The country name
 * @returns {string} - Formatted phone number with international prefix
 */
function formatPhoneWithCountryCode(phone, country) {
  if (!phone || !country) return phone;

  // If number already starts with +, return as is (already international format)
  if (phone.startsWith('+')) {
    return phone;
  }

  // If Croatia, return as is (domestic numbers)
  if (country === 'Croatia') {
    return phone;
  }

  // Get country calling code
  const callingCode = COUNTRY_CALLING_CODES[country];
  if (!callingCode) {
    // Unknown country, return original
    return phone;
  }

  // Remove leading zero if present (common in European local numbers)
  let formattedPhone = phone.trim();
  if (formattedPhone.startsWith('0')) {
    formattedPhone = formattedPhone.substring(1);
  }

  // Remove spaces and format
  formattedPhone = formattedPhone.replace(/\s+/g, ' ');

  // Return with international prefix
  return `${callingCode} ${formattedPhone}`;
}

/**
 * Parse Google formatted address into components
 * Example: "Breg 2, 1000 Ljubljana, Slovenia"
 * Returns: { street: "Breg 2", city: "Ljubljana", country: "Slovenia" }
 */
function parseGoogleAddress(formattedAddress) {
  if (!formattedAddress) {
    return { street: null, city: null, country: null };
  }

  const parts = formattedAddress.split(',').map(part => part.trim());

  if (parts.length >= 3) {
    // Standard format: "Street, Postal City, Country"
    const street = parts[0];
    const cityWithPostal = parts[parts.length - 2];
    const country = parts[parts.length - 1];

    // Extract city from "1000 Ljubljana" format
    const cityMatch = cityWithPostal.match(/\d*\s*(.+)/);
    const city = cityMatch ? cityMatch[1].trim() : cityWithPostal;

    return { street, city, country };
  } else if (parts.length === 2) {
    // Simple format: "Street, Country"
    return { street: parts[0], city: null, country: parts[1] };
  } else {
    // Fallback: use entire address as street
    return { street: formattedAddress, city: null, country: null };
  }
}

/**
 * Transform Google Places data to Restaurant model format
 * Only imports essential fields: address, city, country, coordinates, phone, website, hours, price level
 */
function transformToRestaurantData(placeDetails) {
  // Parse the formatted address to extract street, city, and country
  const addressParsed = parseGoogleAddress(placeDetails.formatted_address);

  // Get phone and format with country code if not Croatia
  const rawPhone = placeDetails.formatted_phone_number || placeDetails.international_phone_number;
  const formattedPhone = formatPhoneWithCountryCode(rawPhone, addressParsed.country);

  const data = {
    name: placeDetails.name,
    placeId: placeDetails.place_id,
    address: addressParsed.street || placeDetails.formatted_address,
    place: addressParsed.city,
    country: addressParsed.country,
    latitude: placeDetails.geometry.location.lat,
    longitude: placeDetails.geometry.location.lng,
    phone: formattedPhone,
    websiteUrl: placeDetails.website,
    priceLevel: placeDetails.price_level,
  };

  // Transform opening hours if available
  if (placeDetails.opening_hours) {
    // Fix day shift: Google uses 0=Sunday, 1=Monday... 6=Saturday
    // We need 0=Monday, 1=Tuesday... 6=Sunday
    const periods = (placeDetails.opening_hours.periods || []).map(period => {
      const fixDay = (day) => {
        // Google: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
        // Ours:   0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
        // Formula: Google 0 (Sun) → 6, Google 1 (Mon) → 0, etc.
        return day === 0 ? 6 : day - 1;
      };

      return {
        open: period.open ? {
          day: fixDay(period.open.day),
          time: period.open.time,
        } : undefined,
        close: period.close ? {
          day: fixDay(period.close.day),
          time: period.close.time,
        } : undefined,
      };
    });

    data.openingHours = {
      weekday_text: placeDetails.opening_hours.weekday_text || [],
      periods: periods,
      open_now: placeDetails.opening_hours.open_now || false,
    };
    data.isOpenNow = placeDetails.opening_hours.open_now;
  }

  return data;
}

/**
 * Get photo URL from photo reference
 */
function getPhotoUrl(photoReference, maxWidth = 800) {
  if (!photoReference) return null;
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`;
}

/**
 * Check if restaurant already exists by Place ID
 */
async function checkRestaurantExists(placeId) {
  const existing = await Restaurant.findOne({
    where: { placeId },
    attributes: ['id', 'name', 'slug', 'placeId'],
  });
  return existing;
}

/**
 * Check if restaurant should be updated from Google Places
 * @param {Date|null} lastGoogleUpdate - Timestamp of last update
 * @param {number} daysThreshold - Number of days before update is needed (default: 7)
 * @returns {boolean} - True if update is needed
 */
function shouldUpdateFromGoogle(lastGoogleUpdate, daysThreshold = 7) {
  // If never updated, should update
  if (!lastGoogleUpdate) {
    return true;
  }

  // Check if more than threshold days have passed
  const now = new Date();
  const lastUpdate = new Date(lastGoogleUpdate);
  const daysSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60 * 24);

  return daysSinceUpdate >= daysThreshold;
}

/**
 * Update unclaimed restaurant data from Google Places API
 * This runs asynchronously in the background and updates:
 * - address, place, country
 * - phone, websiteUrl
 * - openingHours, priceLevel
 *
 * @param {string} placeId - Google Place ID
 * @param {string} restaurantId - Restaurant database ID
 * @returns {Promise<boolean>} - True if updated successfully
 */
async function updateRestaurantFromGoogle(placeId, restaurantId) {
  try {
    console.log(`[Background] Starting Google Places update for restaurant ${restaurantId}`);

    // Fetch fresh data from Google Places API
    const placeDetails = await getPlaceDetails(placeId);

    // Transform to our format
    const updatedData = transformToRestaurantData(placeDetails);

    // Find restaurant
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      console.error(`[Background] Restaurant ${restaurantId} not found`);
      return false;
    }

    // Only update if restaurant is unclaimed
    if (restaurant.isClaimed) {
      console.log(`[Background] Restaurant ${restaurantId} is claimed, skipping update`);
      return false;
    }

    // Update only the fields we get from Google
    await restaurant.update({
      address: updatedData.address,
      place: updatedData.place,
      country: updatedData.country,
      phone: updatedData.phone,
      websiteUrl: updatedData.websiteUrl,
      openingHours: updatedData.openingHours,
      priceLevel: updatedData.priceLevel,
      lastGoogleUpdate: new Date(),
    });

    console.log(`[Background] Successfully updated restaurant ${restaurantId} from Google Places`);
    return true;
  } catch (error) {
    console.error(`[Background] Error updating restaurant ${restaurantId} from Google:`, error.message);
    return false;
  }
}

/**
 * Search for nearby restaurants using Google Places Nearby Search API
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radius - Radius in meters (max 50000)
 * @param {number} limit - Number of results to return (default 20)
 * @returns {Promise<Array>} Array of restaurant objects
 */
async function searchNearbyRestaurants(lat, lng, radius = 10000, limit = 20) {
  try {
    // NO CACHE - restaurants are saved to DB and will be found on next search
    console.log(`[Google Places] Fetching from Nearby Search API (target: ${limit} restaurants)`);

    let allResults = [];
    let nextPageToken = null;
    let pageCount = 0;
    let totalFiltered = 0;
    const maxPages = 3; // Google allows max 3 pages (60 results total)

    // Filter and transform function
    const processPlace = (place) => {
      // 1. Must have rating and reviews (real restaurants have these)
      if (!place.rating || !place.user_ratings_total) {
        console.log(`[Filter] Skipping ${place.name} - no rating/reviews`);
        totalFiltered++;
        return null;
      }

      // 2. Filter out lodging (hotels, camps, etc.)
      const types = place.types || [];
      const isLodging = types.some(t => ['lodging', 'campground', 'rv_park'].includes(t));

      if (isLodging) {
        console.log(`[Filter] Skipping ${place.name} - lodging (${types.join(', ')})`);
        totalFiltered++;
        return null;
      }

      // Transform to our format
      const addressParts = place.vicinity ? place.vicinity.split(',') : [];
      const place_name = addressParts.length > 0 ? addressParts[addressParts.length - 1].trim() : '';

      return {
        placeId: place.place_id,
        name: place.name,
        address: place.vicinity || '',
        place: place_name,
        rating: place.rating,
        userRatingsTotal: place.user_ratings_total,
        types: place.types,
        photoReference: place.photos?.[0]?.photo_reference || null,
        location: place.geometry.location,
        businessStatus: place.business_status,
        priceLevel: place.price_level,
      };
    };

    // Fetch pages until we have enough restaurants or run out of pages
    do {
      pageCount++;
      console.log(`[Google Places] Fetching page ${pageCount}...`);

      const params = {
        location: `${lat},${lng}`,
        radius: radius,
        type: 'restaurant',
        rankby: 'prominence',
        key: GOOGLE_PLACES_API_KEY,
      };

      // Add pagetoken if we have one (for page 2+)
      if (nextPageToken) {
        params.pagetoken = nextPageToken;
      }

      const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
        params,
      });

      if (response.data.status === 'ZERO_RESULTS') {
        break;
      }

      if (response.data.status === 'INVALID_REQUEST' && nextPageToken) {
        // Next page token not ready yet, wait 2 seconds
        console.log('[Google Places] Waiting for next page token...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue; // Retry same request
      }

      if (response.data.status !== 'OK') {
        console.error('Google Places Nearby API error:', response.data.status);
        throw new Error(`Google Places API error: ${response.data.status}`);
      }

      // Process and filter this page's results
      const pageResults = response.data.results
        .map(processPlace)
        .filter(r => r !== null); // Remove filtered out places

      allResults = allResults.concat(pageResults);
      console.log(`[Google Places] Page ${pageCount}: Found ${pageResults.length} restaurants (total: ${allResults.length})`);

      // Check if we have enough
      if (allResults.length >= limit) {
        break;
      }

      // Get next page token
      nextPageToken = response.data.next_page_token;

      // If we have more pages, wait 2 seconds (Google requires delay)
      if (nextPageToken && pageCount < maxPages) {
        console.log('[Google Places] Waiting 2s before next page...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } while (nextPageToken && pageCount < maxPages && allResults.length < limit);

    // Take only what we need
    const results = allResults.slice(0, limit);

    console.log(`[Google Places] Completed: ${results.length} restaurants from ${pageCount} page(s) (filtered out ${totalFiltered} hotels/invalid)`);
    return results;
  } catch (error) {
    console.error('Error searching nearby restaurants:', error);
    throw error;
  }
}

/**
 * Generate unique slug for restaurant name
 * Handles special characters (Croatian, Slovenian, etc.) and ensures uniqueness
 * @param {string} name - Restaurant name
 * @returns {Promise<string>} - Unique slug
 */
async function generateSlug(name) {
  const { Restaurant } = require('../../models');

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

  // Check for uniqueness
  while (await Restaurant.findOne({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix++;
  }

  return slug;
}

/**
 * Import unclaimed restaurant from basic Google Places data (Nearby Search)
 * Uses basic data only - NO Place Details call (saves $0.017 per restaurant)
 * @param {Object} placeData - Place data from Nearby Search API
 * @returns {Promise<Object>} Created restaurant object
 */
async function importUnclaimedRestaurantBasic(placeData) {
  try {
    const { Restaurant } = require('../../models');

    // Check if already exists
    const existing = await Restaurant.findOne({
      where: { placeId: placeData.placeId },
    });

    if (existing) {
      console.log(`[Import] Restaurant already exists: ${existing.name}`);
      return existing;
    }

    // Parse address to extract street, city, country
    // Google Nearby Search returns "vicinity" like: "Kersnikova ulica 1, Ljubljana"
    // We need to extract: address (street), place (city), country
    const addressParts = placeData.address ? placeData.address.split(',').map(p => p.trim()) : [];

    let street = placeData.address || 'Address not available';
    let city = placeData.place; // From our transformed data
    let country = null;

    // If we have multiple parts, try to extract country from last part
    if (addressParts.length >= 2) {
      // Format: "Street, City" or "Street, City, Country"
      street = addressParts[0];

      // Check if last part is a known country
      const lastPart = addressParts[addressParts.length - 1];
      if (COUNTRY_CALLING_CODES[lastPart]) {
        country = lastPart;
        // City is the second-to-last part
        if (addressParts.length >= 3) {
          city = addressParts[addressParts.length - 2];
        }
      } else {
        // No country in address, last part is city
        city = lastPart;
      }
    }

    // Generate unique slug
    const slug = await generateSlug(placeData.name);

    // Create basic unclaimed restaurant from Nearby Search data
    const restaurant = await Restaurant.create({
      name: placeData.name,
      slug: slug,
      placeId: placeData.placeId,
      address: street,
      place: city,
      country: country, // May be null, will be filled on lazy load
      latitude: placeData.location.lat,
      longitude: placeData.location.lng,
      phone: null, // Not available in basic data
      rating: placeData.rating || null,
      userRatingsTotal: placeData.userRatingsTotal || null,
      priceLevel: placeData.priceLevel || null,
      types: placeData.types || [],
      businessStatus: placeData.businessStatus || null,
      isClaimed: false,
    });

    console.log(`[Import] Created basic unclaimed restaurant: ${restaurant.name} (${restaurant.id}) - slug: ${slug}`);
    return restaurant;
  } catch (error) {
    console.error('Error importing unclaimed restaurant (basic):', error);
    throw error;
  }
}

/**
 * Import unclaimed restaurant from Google Place ID (with full details)
 * Fetches Place Details - costs $0.017 per call
 * Use this only when you need full data (phone, hours, etc.)
 * @param {string} placeId - Google Place ID
 * @returns {Promise<Object>} Created restaurant object
 */
async function importUnclaimedRestaurant(placeId) {
  try {
    const { Restaurant } = require('../../models');

    // Check if already exists
    const existing = await Restaurant.findOne({
      where: { placeId },
    });

    if (existing) {
      console.log(`[Import] Restaurant already exists: ${existing.name}`);
      return existing;
    }

    // Fetch details from Google
    const placeDetails = await getPlaceDetails(placeId);

    // Transform to restaurant data
    const restaurantData = transformToRestaurantData(placeDetails);

    // Generate unique slug
    const slug = await generateSlug(placeDetails.name);

    // Create as unclaimed
    const restaurant = await Restaurant.create({
      ...restaurantData,
      slug: slug,
      isClaimed: false,
      rating: placeDetails.rating || null,
      userRatingsTotal: placeDetails.user_ratings_total || null,
      types: placeDetails.types || [],
      businessStatus: placeDetails.business_status || null,
    });

    console.log(`[Import] Created unclaimed restaurant: ${restaurant.name} (${restaurant.id}) - slug: ${slug}`);
    return restaurant;
  } catch (error) {
    console.error('Error importing unclaimed restaurant:', error);
    throw error;
  }
}

module.exports = {
  extractPlaceIdFromUrl,
  searchPlacesByText,
  getPlaceDetails,
  transformToRestaurantData,
  getPhotoUrl,
  checkRestaurantExists,
  getPlaceIdFromCoordinates,
  shouldUpdateFromGoogle,
  updateRestaurantFromGoogle,
  searchNearbyRestaurants,
  importUnclaimedRestaurant,
  importUnclaimedRestaurantBasic,
  generateSlug,
};
