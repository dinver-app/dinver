'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Extend enum used by Coupons.conditionKind in Postgres
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_Coupons_conditionKind" ADD VALUE IF NOT EXISTS 'VISITS_SAME_RESTAURANT_AT_LEAST';`,
    );
  },

  async down(queryInterface, Sequelize) {
    // No safe down migration for removing enum values; leave as no-op
  },
};
