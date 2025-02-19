'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn(
      'Restaurants',
      'description',
      'working_hours_info',
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameColumn(
      'Restaurants',
      'working_hours_info',
      'description',
    );
  },
};
