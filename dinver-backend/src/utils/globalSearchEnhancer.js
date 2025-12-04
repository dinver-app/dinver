/**
 * Global Search Enhancer - Tier 2 & 3 Logic
 * Extends local search results with worldwide database search and Google Places fallback
 */

const { Restaurant, PriceCategory } = require('../../models');
const { calculateDistance } = require('./distance');
const { addTestFilter } = require('./restaurantFilter');
const {
  searchGooglePlacesText,
  importUnclaimedRestaurantBasic,
} = require('../services/googlePlacesService');

/**
 * Determine search mode based on user query and filters
 *
 * RULES:
 * 1. Menu search ("pizza, capriciosa") → claimed only, 60km, NO Google
 * 2. Filters active → claimed only, 60km, NO Google
 * 3. Restaurant name → claimed + unclaimed, worldwide, YES Google (if < threshold)
 */
function determineSearchMode(params) {
  const {
    priceCategoryIds,
    establishmentPerkIds,
    foodTypeIds,
    dietaryTypeIds,
    minRating,
    establishmentTypeIds,
    mealTypeIds,
    hasComma,
    searchTerms,
  } = params;

  const hasFilters = !!(
    priceCategoryIds ||
    establishmentPerkIds ||
    foodTypeIds ||
    dietaryTypeIds ||
    minRating ||
    establishmentTypeIds ||
    mealTypeIds
  );

  const isMenuSearch = hasComma && searchTerms.length > 1;

  // Menu search OR filters → LOCAL CLAIMED ONLY
  if (isMenuSearch) {
    return {
      mode: 'menu_search',
      isLocalDiscovery: true,
      isGlobalSearch: false,
      claimedOnly: true,
      maxDistance: 60,
      enableTier2: false,
      enableTier3: false,
    };
  }

  if (hasFilters) {
    return {
      mode: 'filtered_search',
      isLocalDiscovery: true,
      isGlobalSearch: false,
      claimedOnly: true,
      maxDistance: 60,
      enableTier2: false,
      enableTier3: false,
    };
  }

  // Restaurant name search → GLOBAL (claimed + unclaimed, worldwide, Google fallback)
  return {
    mode: 'global_search',
    isLocalDiscovery: false,
    isGlobalSearch: true,
    claimedOnly: false,
    maxDistance: null, // No limit for global
    enableTier2: true,
    enableTier3: true,
  };
}

/**
 * Tier 2: Extended Database Search (worldwide, no distance limit)
 * Searches entire database for claimed + unclaimed restaurants
 */
async function performExtendedDatabaseSearch(params) {
  const {
    searchTerms,
    userEmail,
    restaurantQuery,
    userLat,
    userLng,
    MAX_SEARCH_DISTANCE_KM,
  } = params;

  console.log('[Tier 2] Performing extended database search (worldwide)...');

  // Create query WITHOUT distance filtering (worldwide)
  const extendedQuery = {
    ...restaurantQuery,
    where: {
      ...restaurantQuery.where,
    },
  };

  // Remove isClaimed filter - search BOTH claimed and unclaimed
  delete extendedQuery.where.isClaimed;

  // Apply test filter for both
  const baseWhere = addTestFilter({}, userEmail);
  extendedQuery.where = {
    ...extendedQuery.where,
    ...baseWhere,
  };

  // Perform search
  const restaurants = await Restaurant.findAll(extendedQuery);

  // Calculate distances
  const restaurantsWithDistance = restaurants.map((restaurant) => {
    const distance = calculateDistance(
      userLat,
      userLng,
      restaurant.latitude,
      restaurant.longitude,
    );

    return {
      ...restaurant.toJSON(),
      distance,
      isDistant: distance > MAX_SEARCH_DISTANCE_KM,
      source: distance <= MAX_SEARCH_DISTANCE_KM ? 'local' : 'extended',
    };
  });

  console.log(`[Tier 2] Found ${restaurantsWithDistance.length} restaurants worldwide`);
  return restaurantsWithDistance;
}

/**
 * Tier 3: Google Places Text Search Fallback
 * Fetches restaurants from Google Places API
 */
async function performGooglePlacesFallback(params) {
  const {
    query,
    userLat,
    userLng,
    calculateDistance: calcDist,
    MAX_SEARCH_DISTANCE_KM,
  } = params;

  console.log('[Tier 3] Performing Google Places Text Search fallback...');

  try {
    // Fetch from Google Places Text Search
    const googleResults = await searchGooglePlacesText(query, userLat, userLng, 10);

    if (googleResults.length === 0) {
      console.log('[Tier 3] No results from Google Places');
      return [];
    }

    // Separate high-quality and low-quality for logging purposes
    const highQuality = [];
    const lowQuality = [];

    for (const place of googleResults) {
      // Calculate match score (simple name similarity)
      const matchScore = calculateMatchScore(query, place.name);

      const isHighQuality =
        place.rating >= 4.0 &&
        place.userRatingsTotal >= 10 &&
        matchScore >= 0.8;

      if (isHighQuality) {
        highQuality.push(place);
      } else {
        lowQuality.push(place);
      }
    }

    console.log(`[Tier 3] Found ${highQuality.length} high-quality, ${lowQuality.length} low-quality`);

    // IMMEDIATE BASIC IMPORT - import ALL to DB right away (no Place Details API call)
    // This saves cost for future users (they get data from DB, not Google API)
    const allResults = [];

    // Import high-quality restaurants
    for (const place of highQuality) {
      try {
        const restaurant = await importUnclaimedRestaurantBasic(place);
        const distance = calcDist(
          userLat,
          userLng,
          restaurant.latitude,
          restaurant.longitude,
        );

        allResults.push({
          ...restaurant.toJSON(),
          distance,
          isDistant: distance > MAX_SEARCH_DISTANCE_KM,
          source: 'google_basic_import',
          isImported: true,
          hasFullDetails: false, // Basic import - no openingHours, phone, etc.
        });
      } catch (error) {
        console.error(`[Tier 3] Failed to import high-quality ${place.name}:`, error.message);
      }
    }

    // Import low-quality restaurants too (they all go to DB now, no cache)
    for (const place of lowQuality) {
      try {
        const restaurant = await importUnclaimedRestaurantBasic(place);
        const distance = calcDist(
          userLat,
          userLng,
          restaurant.latitude,
          restaurant.longitude,
        );

        allResults.push({
          ...restaurant.toJSON(),
          distance,
          isDistant: distance > MAX_SEARCH_DISTANCE_KM,
          source: 'google_basic_import',
          isImported: true,
          hasFullDetails: false,
        });
      } catch (error) {
        console.error(`[Tier 3] Failed to import low-quality ${place.name}:`, error.message);
      }
    }

    console.log(
      `[Tier 3] Imported ${allResults.length} restaurants to DB (${highQuality.length} high-quality + ${lowQuality.length} low-quality)`
    );

    return allResults;
  } catch (error) {
    console.error('[Tier 3] Google Places error:', error.message);
    return [];
  }
}

/**
 * Simple match score calculator
 */
function calculateMatchScore(query, text) {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  if (textLower === queryLower) return 1.0;
  if (textLower.includes(queryLower)) return 0.9;
  if (textLower.startsWith(queryLower)) return 0.85;

  // Word-level matching
  const queryWords = queryLower.split(/\s+/);
  const textWords = textLower.split(/\s+/);

  let matches = 0;
  for (const qWord of queryWords) {
    if (textWords.some(tWord => tWord.includes(qWord) || qWord.includes(tWord))) {
      matches++;
    }
  }

  return matches / queryWords.length;
}

/**
 * Sort restaurants: CLAIMED FIRST, then unclaimed by score
 * This is the key requirement from the user
 */
function sortRestaurantsByPriority(restaurants, sortCriteria = 'smartScore') {
  // Separate claimed and unclaimed
  const claimed = restaurants.filter(r => r.isClaimed);
  const unclaimed = restaurants.filter(r => !r.isClaimed);

  // Sort each group
  const sortFn = (a, b) => {
    switch (sortCriteria) {
      case 'smartScore':
        return (b.smartScore || 0) - (a.smartScore || 0);
      case 'distance':
        return (a.distance || 0) - (b.distance || 0);
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      default:
        return (b.smartScore || 0) - (a.smartScore || 0);
    }
  };

  claimed.sort(sortFn);
  unclaimed.sort(sortFn);

  // CLAIMED ALWAYS FIRST!
  return [...claimed, ...unclaimed];
}

/**
 * Main enhancer function - extends local results with Tier 2 & 3
 */
async function enhanceSearchResults(localResults, params) {
  const {
    searchMode,
    query,
    userLat,
    userLng,
    MAX_SEARCH_DISTANCE_KM,
    minResultsForTier2,
    minResultsForTier3,
  } = params;

  // If Local Discovery mode (menu search or filters), return only local claimed
  if (searchMode.isLocalDiscovery) {
    console.log(`[Search Mode] ${searchMode.mode} - returning local CLAIMED only (60km)`);

    // Filter to only claimed and within 60km
    const claimedLocal = localResults.filter(
      r => r.isClaimed && r.distance <= MAX_SEARCH_DISTANCE_KM
    );

    return {
      restaurants: claimedLocal,
      meta: {
        mode: searchMode.mode,
        tier: 'local',
        localCount: claimedLocal.length,
        extendedCount: 0,
        googleCount: 0,
      },
    };
  }

  // Global Search Mode - apply Tier 2 & 3
  console.log('[Search Mode] Global Search - checking if Tier 2/3 needed...');

  let allResults = [...localResults];
  let tier = 'local';
  let extendedCount = 0;
  let googleCount = 0;

  // Tier 2: Extended Database Search (if < threshold results)
  if (allResults.length < minResultsForTier2) {
    console.log(`[Tier 2] Only ${allResults.length} local results, searching worldwide...`);

    const extendedResults = await performExtendedDatabaseSearch(params);

    // Remove duplicates (already in local results)
    const localIds = new Set(localResults.map(r => r.id));
    const newExtendedResults = extendedResults.filter(r => !localIds.has(r.id));

    allResults = [...allResults, ...newExtendedResults];
    extendedCount = newExtendedResults.length;
    tier = 'extended';

    console.log(`[Tier 2] Added ${extendedCount} worldwide results (total: ${allResults.length})`);
  }

  // Tier 3: Google Places Fallback (if still < threshold)
  if (allResults.length < minResultsForTier3) {
    console.log(`[Tier 3] Only ${allResults.length} total results, fetching from Google...`);

    const googleResults = await performGooglePlacesFallback({
      ...params,
      calculateDistance,
    });

    allResults = [...allResults, ...googleResults];
    googleCount = googleResults.length;
    tier = 'google';

    console.log(`[Tier 3] Added ${googleCount} Google results (total: ${allResults.length})`);
  }

  return {
    restaurants: allResults,
    meta: {
      mode: 'global_search',
      tier,
      localCount: localResults.length,
      extendedCount,
      googleCount,
    },
  };
}

module.exports = {
  determineSearchMode,
  enhanceSearchResults,
  sortRestaurantsByPriority,
  performExtendedDatabaseSearch,
  performGooglePlacesFallback,
};
