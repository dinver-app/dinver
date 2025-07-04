'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.dropTable('analytics_events');
  },
  async down(queryInterface, Sequelize) {
    // No down migration needed (table will be recreated by next migration)
  },
};
