'use strict';

/**
 * Migration: Add 'OTHER' category to RestaurantUpdates ENUM
 *
 * This migration adds the 'OTHER' catch-all category to the existing
 * category ENUM type for RestaurantUpdates table.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add 'OTHER' value to the category ENUM
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_RestaurantUpdates_category" ADD VALUE IF NOT EXISTS 'OTHER';
    `);
  },

  async down(queryInterface, Sequelize) {
    // Removing ENUM values is complex in PostgreSQL and rarely needed.
    // If necessary, it requires creating a new ENUM type without 'OTHER',
    // converting the column, and dropping the old type.
    // For this case, we'll just log a warning.
    console.warn(
      'Warning: Removing ENUM values is not supported in this migration. ' +
      'Manual intervention required to remove OTHER category if needed.'
    );
  },
};
