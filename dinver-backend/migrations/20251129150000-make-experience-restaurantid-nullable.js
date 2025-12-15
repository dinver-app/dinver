'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Make restaurantId nullable in Experiences table
    // This allows creating experiences for pending visits that don't have a restaurant yet
    await queryInterface.changeColumn('Experiences', 'restaurantId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Restaurants',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  },

  async down(queryInterface, Sequelize) {
    // Note: This will fail if there are NULL values in restaurantId
    await queryInterface.changeColumn('Experiences', 'restaurantId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'Restaurants',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  },
};
