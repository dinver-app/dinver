'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add lastGoogleUpdate column to Restaurants table
    await queryInterface.addColumn('Restaurants', 'lastGoogleUpdate', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp of last automatic update from Google Places API',
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove lastGoogleUpdate column
    await queryInterface.removeColumn('Restaurants', 'lastGoogleUpdate');
  }
};
