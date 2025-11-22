'use strict';

/**
 * Migration: Create google_places_cache table
 *
 * Purpose: Cache Google Places API results to reduce API costs
 * - Saves $0.032 per cached query
 * - Permanent storage (no TTL)
 * - Tracks usage stats (hit_count, last_used_at)
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('google_places_cache', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      search_query: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Normalized search query (lowercase, trimmed)',
      },
      location_lat: {
        type: Sequelize.DECIMAL(10, 6),
        allowNull: true,
        comment: 'Latitude for location-biased searches (rounded to 2 decimals for caching)',
      },
      location_lng: {
        type: Sequelize.DECIMAL(10, 6),
        allowNull: true,
        comment: 'Longitude for location-biased searches (rounded to 2 decimals for caching)',
      },
      results: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
        comment: 'Array of Google Places API results (placeId, name, address, etc.)',
      },
      hit_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of times this cache entry was used (for analytics)',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      last_used_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Last time this cache entry was accessed',
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Create index on search_query for fast lookups
    await queryInterface.addIndex('google_places_cache', ['search_query'], {
      name: 'idx_google_places_cache_search_query',
    });

    // Create composite index on location for geo-searches
    await queryInterface.addIndex(
      'google_places_cache',
      ['location_lat', 'location_lng'],
      {
        name: 'idx_google_places_cache_location',
      },
    );

    // Create index on hit_count for analytics queries
    await queryInterface.addIndex('google_places_cache', ['hit_count'], {
      name: 'idx_google_places_cache_hit_count',
    });

    console.log('[Migration] Created google_places_cache table with indexes');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('google_places_cache');
    console.log('[Migration] Dropped google_places_cache table');
  },
};
