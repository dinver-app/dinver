/**
 * Global Search Enhancer - Tier 2 & 3 Logic
 * Extends local search results with worldwide database search and Google Places fallback
 */

const { Restaurant } = require('../../models');
const { calculateDistance } = require('../../utils/distance');
const { addTestFilter } = require('../../utils/restaurantFilter');
const {
  searchGooglePlacesText,
  importUnclaimedRestaurantBasic,
  setLogContext,
  clearLogContext,
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

  // Calculate distances and filter by proximity + relevance
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

  // SMART FILTERING: If too many results (> 100), prioritize nearby + exact matches
  if (restaurantsWithDistance.length > 100) {
    const query = (searchTerms[0] || '').toLowerCase().trim();

    // Separate into nearby (< 50km) and distant
    const nearby = restaurantsWithDistance.filter(r => r.distance <= 50);
    const distant = restaurantsWithDistance.filter(r => r.distance > 50);

    // Find exact/startsWith matches (high priority)
    const exactMatches = nearby.filter(r => {
      const name = (r.name || '').toLowerCase().trim();
      return name === query || name.startsWith(query + ' ');
    });

    // Take top 50 nearby + all exact matches from distant
    const distantExactMatches = distant.filter(r => {
      const name = (r.name || '').toLowerCase().trim();
      return name === query || name.startsWith(query + ' ');
    });

    const filtered = [
      ...exactMatches,
      ...nearby.filter(r => !exactMatches.includes(r)).slice(0, 50),
      ...distantExactMatches.slice(0, 10),
    ];

    console.log(`[Tier 2] Filtered from ${restaurantsWithDistance.length} to ${filtered.length} (prioritized nearby + exact matches)`);
    return filtered;
  }

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
    userId,
  } = params;

  console.log('[Tier 3] Performing Google Places Text Search fallback...');

  // Set logging context for Google API calls
  setLogContext({
    triggeredBy: 'global_search',
    triggerReason: `text_search_fallback: "${query}"`,
    userId: userId || null,
  });

  try {
    // Fetch from Google Places Text Search
    // Fetch more results to help reach target of 100 total restaurants
    const googleResults = await searchGooglePlacesText(query, userLat, userLng, 60);

    if (googleResults.length === 0) {
      console.log('[Tier 3] No results from Google Places');
      return [];
    }

    // STRICT NAME FILTERING: Only keep results with decent name match
    // This prevents irrelevant results like "River pub" for query "basc"
    const MIN_NAME_MATCH_SCORE = 0.5; // Name must contain part of the query

    const nameFilteredResults = [];
    let filteredOutCount = 0;

    for (const place of googleResults) {
      const matchScore = calculateMatchScore(query, place.name);

      if (matchScore >= MIN_NAME_MATCH_SCORE) {
        nameFilteredResults.push({ ...place, matchScore });
      } else {
        filteredOutCount++;
        console.log(`[Tier 3] Filtered out "${place.name}" (match score: ${matchScore.toFixed(2)} < ${MIN_NAME_MATCH_SCORE})`);
      }
    }

    console.log(`[Tier 3] Name filtering: kept ${nameFilteredResults.length}, filtered ${filteredOutCount} irrelevant results`);

    // Separate high-quality and low-quality for logging purposes
    const highQuality = [];
    const lowQuality = [];

    for (const place of nameFilteredResults) {
      const isHighQuality =
        place.rating >= 4.0 &&
        place.userRatingsTotal >= 10 &&
        place.matchScore >= 0.8;

      if (isHighQuality) {
        highQuality.push(place);
      } else {
        lowQuality.push(place);
      }
    }

    console.log(`[Tier 3] Found ${highQuality.length} high-quality, ${lowQuality.length} low-quality`);

    // BULK DUPLICATE CHECK: Check all placeIds at once BEFORE importing
    const allPlaces = [...highQuality, ...lowQuality];
    const allPlaceIds = allPlaces.map(p => p.placeId);

    const existingRestaurants = await Restaurant.findAll({
      attributes: ['id', 'placeId', 'name', 'latitude', 'longitude', 'dinverRating', 'dinverReviewsCount', 'userRatingsTotal'],
      where: {
        placeId: allPlaceIds,
      },
    });

    const existingPlaceIdsMap = new Map(
      existingRestaurants.map(r => [r.placeId, r])
    );

    console.log(`[Tier 3] Bulk duplicate check: ${existingPlaceIdsMap.size} already in DB, ${allPlaces.length - existingPlaceIdsMap.size} new`);

    // IMMEDIATE BASIC IMPORT - import NEW restaurants only
    // Return BOTH existing (from DB) and newly imported
    const allResults = [];
    let importedCount = 0;
    let skippedCount = 0;

    for (const place of allPlaces) {
      const existingRestaurant = existingPlaceIdsMap.get(place.placeId);

      if (existingRestaurant) {
        // Already in DB - return it directly
        const distance = calcDist(
          userLat,
          userLng,
          existingRestaurant.latitude,
          existingRestaurant.longitude,
        );

        const restaurantData = existingRestaurant.toJSON();

        // Calculate basic smartScore for exact/startsWith match boost
        const name = (restaurantData.name || '').toLowerCase().trim();
        const queryLower = query.toLowerCase().trim();
        const exactMatchBoost = name === queryLower ? 500 : 0;
        const startsWithBoost = name.startsWith(queryLower + ' ') ? 200 : 0;
        const distanceWeight = 1 / (1 + distance);
        const ratingBoost = ((restaurantData.dinverRating || restaurantData.rating || 0) / 5) * 3;

        allResults.push({
          ...restaurantData,
          distance,
          isDistant: distance > MAX_SEARCH_DISTANCE_KM,
          source: 'database', // Already in DB
          isImported: false,
          // Map ONLY Dinver ratings (no Google fallback)
          rating: restaurantData.dinverRating || null,
          reviewsCount: restaurantData.dinverReviewsCount || 0,
          // SmartScore for sorting (exact match gets priority)
          smartScore: exactMatchBoost + startsWithBoost + distanceWeight * 12 + ratingBoost,
        });
        skippedCount++;
      } else {
        // New restaurant - import it
        try {
          const restaurant = await importUnclaimedRestaurantBasic(place);
          const distance = calcDist(
            userLat,
            userLng,
            restaurant.latitude,
            restaurant.longitude,
          );

          // Calculate basic smartScore for exact/startsWith match boost
          const name = (restaurant.name || '').toLowerCase().trim();
          const queryLower = query.toLowerCase().trim();
          const exactMatchBoost = name === queryLower ? 500 : 0;
          const startsWithBoost = name.startsWith(queryLower + ' ') ? 200 : 0;
          const distanceWeight = 1 / (1 + distance);
          const ratingBoost = ((restaurant.rating || 0) / 5) * 3;

          allResults.push({
            ...restaurant.toJSON(),
            distance,
            isDistant: distance > MAX_SEARCH_DISTANCE_KM,
            source: 'google_basic_import',
            isImported: true,
            hasFullDetails: false, // Basic import - no openingHours, phone, etc.
            // SmartScore for sorting (exact match gets priority)
            smartScore: exactMatchBoost + startsWithBoost + distanceWeight * 12 + ratingBoost,
          });
          importedCount++;
        } catch (error) {
          console.error(`[Tier 3] Failed to import ${place.name}:`, error.message);
        }
      }
    }

    console.log(
      `[Tier 3] Results: ${importedCount} newly imported, ${skippedCount} from DB (total: ${allResults.length})`
    );

    // Clear logging context
    clearLogContext();

    return allResults;
  } catch (error) {
    console.error('[Tier 3] Google Places error:', error.message);
    // Clear logging context on error too
    clearLogContext();
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
    userId, // For API logging
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

  // Tier 3: Google Places Fallback
  // SMART TRIGGER - Balance between quality and cost:
  // 1. Not enough total results (< threshold), OR
  // 2. No exact/startsWith match NEARBY (< 5km) AND few nearby results (< 3)
  //
  // This prevents calling Google for generic queries like "pizza" or "italian"
  // that have many results, but DOES call Google for specific restaurants
  // like "Pizzeria 14" that don't exist nearby.
  const NEARBY_RADIUS_KM = 5; // Consider only nearby restaurants
  const nearbyResults = allResults.filter(r => r.distance <= NEARBY_RADIUS_KM);

  // Check if we have exact/startsWith match NEARBY (not distant)
  const hasExactMatchNearby = nearbyResults.some(r => {
    const name = (r.name || '').toLowerCase().trim();
    const queryLower = query.toLowerCase().trim();
    return name === queryLower || name.startsWith(queryLower + ' ');
  });

  const shouldCallGoogle =
    allResults.length < minResultsForTier3 ||                   // Scenario 1: Not enough total results
    (!hasExactMatchNearby && nearbyResults.length < 3);        // Scenario 2: No exact match nearby + few nearby

  if (shouldCallGoogle) {
    if (!hasExactMatchNearby && nearbyResults.length < 3) {
      console.log(`[Tier 3] No exact/startsWith match nearby (${nearbyResults.length} nearby < 3), fetching from Google...`);
    } else {
      console.log(`[Tier 3] Not enough total results (${allResults.length} < ${minResultsForTier3}), fetching from Google...`);
    }

    const googleResults = await performGooglePlacesFallback({
      ...params,
      calculateDistance,
      userId,
    });

    allResults = [...allResults, ...googleResults];
    googleCount = googleResults.length;
    tier = 'google';

    console.log(`[Tier 3] Added ${googleResults.length} Google results (total: ${allResults.length})`);
  } else {
    console.log(`[Tier 3] Skipping Google - found exact/startsWith match in database`);
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
