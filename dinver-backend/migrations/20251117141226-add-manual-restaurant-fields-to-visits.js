'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add manual restaurant fields for fallback when auto-matching fails
    await queryInterface.addColumn('Visits', 'manualRestaurantName', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'User-provided restaurant name when not found in database',
    });

    await queryInterface.addColumn('Visits', 'manualRestaurantCity', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'User-provided restaurant city when not found in database',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Visits', 'manualRestaurantName');
    await queryInterface.removeColumn('Visits', 'manualRestaurantCity');
  }
};
