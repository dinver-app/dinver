'use strict';

/**
 * Migration: Add PostgreSQL Trigram Extension for Fuzzy Search
 *
 * This enables fuzzy name matching for restaurant searches:
 * - "basc" → "Baščaršija" ✅
 * - "bascr" → "Baschiera" ✅
 * - Typo tolerance
 * - Fast similarity-based ranking
 *
 * Uses PostgreSQL's built-in pg_trgm extension (no external dependencies needed)
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Enable pg_trgm extension (PostgreSQL built-in)
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');

    // 2. Create GIN trigram index on restaurant name for fast fuzzy search
    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS restaurants_name_trigram_idx ON "Restaurants" USING gin (name gin_trgm_ops);'
    );

    // 3. Create GIN trigram index on address for location-based fuzzy search (optional but useful)
    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS restaurants_address_trigram_idx ON "Restaurants" USING gin (address gin_trgm_ops);'
    );

    console.log('[Migration] PostgreSQL trigram search enabled successfully!');
    console.log('[Migration] Indexes created on name and address columns');
  },

  async down(queryInterface, Sequelize) {
    // Drop indexes
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS restaurants_name_trigram_idx;'
    );
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS restaurants_address_trigram_idx;'
    );

    // Note: We don't drop the extension in case other tables use it
    // await queryInterface.sequelize.query('DROP EXTENSION IF EXISTS pg_trgm;');

    console.log('[Migration] Trigram indexes removed');
  }
};
