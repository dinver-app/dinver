'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Enable pg_trgm extension for fuzzy text matching (similarity function)
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
  },

  async down(queryInterface, Sequelize) {
    // Drop the extension (be careful - this will remove all indexes using it)
    await queryInterface.sequelize.query('DROP EXTENSION IF EXISTS pg_trgm;');
  },
};
