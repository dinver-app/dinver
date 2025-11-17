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
async function searchPlacesByText(query) {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
      params: {
        query,
        key: GOOGLE_PLACES_API_KEY,
        type: 'restaurant',
      },
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

      return {
        placeId: place.place_id,
        name: place.name,
        address: place.formatted_address,
        place: place_name, // City/town
        rating: place.rating,
        userRatingsTotal: place.user_ratings_total,
        types: place.types,
        photoReference: place.photos?.[0]?.photo_reference,
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

    return response.data.result;
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
    data.openingHours = {
      weekdayText: placeDetails.opening_hours.weekday_text,
      periods: placeDetails.opening_hours.periods,
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

module.exports = {
  extractPlaceIdFromUrl,
  searchPlacesByText,
  getPlaceDetails,
  transformToRestaurantData,
  getPhotoUrl,
  checkRestaurantExists,
  getPlaceIdFromCoordinates,
};
