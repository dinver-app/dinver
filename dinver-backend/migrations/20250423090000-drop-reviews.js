'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.dropTable('Reviews');
  },

  async down(queryInterface, Sequelize) {
    // We don't want to recreate the old table in down migration
    // The next migration will create the proper table
  },
};
