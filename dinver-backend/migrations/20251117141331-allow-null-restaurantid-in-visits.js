'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Allow restaurantId to be null for fallback scenarios where user provides manual data
    await queryInterface.changeColumn('Visits', 'restaurantId', {
      type: Sequelize.UUID,
      allowNull: true, // Changed from false to true
      references: {
        model: 'Restaurants',
        key: 'id',
      },
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert back to not null (note: this may fail if there are null values)
    await queryInterface.changeColumn('Visits', 'restaurantId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'Restaurants',
        key: 'id',
      },
    });
  }
};
