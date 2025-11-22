/**
 * PostgreSQL-backed cache for Google Places API results
 * Reduces redundant API calls for frequently searched restaurants
 *
 * Benefits over in-memory cache:
 * - Permanent storage (survives server restarts)
 * - Shared between multiple server instances
 * - No TTL expiration (results cached forever)
 * - Usage analytics (hit_count, last_used_at)
 * - Saves $0.032 per cached query
 */

const { searchPlacesByText } = require('./googlePlacesService');
const { GooglePlacesCache } = require('../../models');

/**
 * Search Google Places with PostgreSQL cache
 * @param {string} query - Search query
 * @param {number|null} lat - Latitude for location bias
 * @param {number|null} lng - Longitude for location bias
 * @returns {Promise<Array>} Google Places results
 */
async function searchPlacesWithCache(query, lat = null, lng = null) {
  if (!query) {
    throw new Error('Query is required for Google Places search');
  }

  try {
    // Try to find in cache
    const cached = await GooglePlacesCache.findCached(query, lat, lng);

    if (cached) {
      // Cache hit - return stored results
      return cached.results;
    }

    // Cache miss - call Google Places API
    console.log(`[DB Cache] MISS for query: "${query}" - calling Google API ($0.032)`);

    const results = await searchPlacesByText(query, lat, lng);

    // Store in cache for future use
    await GooglePlacesCache.cacheResults(query, lat, lng, results);

    return results;
  } catch (error) {
    console.error('[DB Cache] Error:', error.message);

    // If cache fails, fall back to direct API call
    if (error.message.includes('Query and results are required')) {
      throw error;
    }

    console.warn('[DB Cache] Falling back to direct Google API call');
    return await searchPlacesByText(query, lat, lng);
  }
}

/**
 * Get cache statistics
 * @returns {Promise<Object>} Cache stats including money saved
 */
async function getCacheStats() {
  try {
    return await GooglePlacesCache.getStats();
  } catch (error) {
    console.error('[DB Cache] Error getting stats:', error.message);
    return {
      totalEntries: 0,
      totalHits: 0,
      moneySaved: '0.00',
      topQueries: [],
      error: error.message,
    };
  }
}

/**
 * Clear unused cache entries (maintenance operation)
 * @param {number} daysUnused - Remove entries not used in X days
 * @returns {Promise<number>} Number of deleted entries
 */
async function clearUnusedCache(daysUnused = 90) {
  try {
    return await GooglePlacesCache.clearUnused(daysUnused);
  } catch (error) {
    console.error('[DB Cache] Error clearing unused entries:', error.message);
    return 0;
  }
}

module.exports = {
  searchPlacesWithCache,
  getCacheStats,
  clearUnusedCache,
};
