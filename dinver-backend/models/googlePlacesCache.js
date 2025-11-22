'use strict';

const { Model } = require('sequelize');

/**
 * GooglePlacesCache model
 *
 * Purpose: Cache Google Places API search results to reduce costs
 * - Saves $0.032 per cached query (Text Search API)
 * - Permanent storage (no TTL expiration)
 * - Tracks usage statistics for analytics
 *
 * Usage:
 * const cached = await GooglePlacesCache.findCached(query, lat, lng);
 * if (!cached) {
 *   const results = await searchPlacesByText(query, lat, lng);
 *   await GooglePlacesCache.cacheResults(query, lat, lng, results);
 * }
 */

module.exports = (sequelize, DataTypes) => {
  class GooglePlacesCache extends Model {
    static associate(models) {
      // No associations needed for cache table
    }

    /**
     * Find cached results for a query
     * @param {string} query - Search query (will be normalized)
     * @param {number|null} lat - Latitude (optional, for location-biased searches)
     * @param {number|null} lng - Longitude (optional, for location-biased searches)
     * @returns {Promise<Object|null>} Cached results or null
     */
    static async findCached(query, lat = null, lng = null) {
      if (!query) return null;

      const normalizedQuery = query.toLowerCase().trim();

      // Round coordinates to 2 decimals for better cache hits (±1.1km accuracy)
      const roundedLat = lat ? parseFloat(lat).toFixed(2) : null;
      const roundedLng = lng ? parseFloat(lng).toFixed(2) : null;

      const cached = await GooglePlacesCache.findOne({
        where: {
          search_query: normalizedQuery,
          location_lat: roundedLat,
          location_lng: roundedLng,
        },
      });

      if (cached) {
        // Update usage stats
        await cached.increment('hit_count');
        await cached.update({ last_used_at: new Date() });

        console.log(
          `[DB Cache] HIT for "${query}" - saved $0.032 (hit #${cached.hit_count + 1})`,
        );
      }

      return cached;
    }

    /**
     * Cache search results
     * @param {string} query - Search query
     * @param {number|null} lat - Latitude
     * @param {number|null} lng - Longitude
     * @param {Array} results - Google Places API results
     * @returns {Promise<GooglePlacesCache>}
     */
    static async cacheResults(query, lat, lng, results) {
      if (!query || !results) {
        throw new Error('Query and results are required for caching');
      }

      const normalizedQuery = query.toLowerCase().trim();
      const roundedLat = lat ? parseFloat(lat).toFixed(2) : null;
      const roundedLng = lng ? parseFloat(lng).toFixed(2) : null;

      // Check if already cached (race condition protection)
      const existing = await GooglePlacesCache.findOne({
        where: {
          search_query: normalizedQuery,
          location_lat: roundedLat,
          location_lng: roundedLng,
        },
      });

      if (existing) {
        console.log(`[DB Cache] Already cached: "${query}"`);
        return existing;
      }

      const cached = await GooglePlacesCache.create({
        search_query: normalizedQuery,
        location_lat: roundedLat,
        location_lng: roundedLng,
        results: results,
        hit_count: 0,
      });

      console.log(`[DB Cache] Cached new query: "${query}" (${results.length} results)`);
      return cached;
    }

    /**
     * Get cache statistics
     * @returns {Promise<Object>} Cache stats
     */
    static async getStats() {
      const [totalEntries, totalHits, topQueries] = await Promise.all([
        GooglePlacesCache.count(),
        GooglePlacesCache.sum('hit_count'),
        GooglePlacesCache.findAll({
          attributes: ['search_query', 'hit_count', 'results', 'created_at', 'last_used_at'],
          order: [['hit_count', 'DESC']],
          limit: 10,
        }),
      ]);

      const moneySaved = (totalHits || 0) * 0.032;

      return {
        totalEntries,
        totalHits: totalHits || 0,
        moneySaved: moneySaved.toFixed(2),
        topQueries: topQueries.map((q) => ({
          query: q.search_query,
          hits: q.hit_count,
          resultsCount: q.results?.length || 0,
          createdAt: q.created_at,
          lastUsedAt: q.last_used_at,
        })),
      };
    }

    /**
     * Clear old unused cache entries (optional maintenance)
     * @param {number} daysUnused - Remove entries not used in X days (default: 90)
     * @returns {Promise<number>} Number of deleted entries
     */
    static async clearUnused(daysUnused = 90) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysUnused);

      const deleted = await GooglePlacesCache.destroy({
        where: {
          last_used_at: {
            [sequelize.Sequelize.Op.lt]: cutoffDate,
          },
          hit_count: 0, // Only delete entries that were never used after creation
        },
      });

      console.log(`[DB Cache] Cleared ${deleted} unused entries older than ${daysUnused} days`);
      return deleted;
    }
  }

  GooglePlacesCache.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      search_query: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Normalized search query (lowercase, trimmed)',
      },
      location_lat: {
        type: DataTypes.DECIMAL(10, 6),
        allowNull: true,
        comment: 'Latitude for location-biased searches (rounded to 2 decimals)',
      },
      location_lng: {
        type: DataTypes.DECIMAL(10, 6),
        allowNull: true,
        comment: 'Longitude for location-biased searches (rounded to 2 decimals)',
      },
      results: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
        comment: 'Array of Google Places API results',
      },
      hit_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of times this cache entry was used',
      },
      last_used_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Last time this cache entry was accessed',
      },
    },
    {
      sequelize,
      modelName: 'GooglePlacesCache',
      tableName: 'google_places_cache',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          fields: ['search_query'],
          name: 'idx_google_places_cache_search_query',
        },
        {
          fields: ['location_lat', 'location_lng'],
          name: 'idx_google_places_cache_location',
        },
        {
          fields: ['hit_count'],
          name: 'idx_google_places_cache_hit_count',
        },
      ],
    },
  );

  return GooglePlacesCache;
};
