'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add restaurantId column to Sizes table
    await queryInterface.addColumn('Sizes', 'restaurantId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'Restaurants',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    // Add index for better performance
    await queryInterface.addIndex('Sizes', ['restaurantId']);
  },

  async down(queryInterface, Sequelize) {
    // Remove restaurantId column from Sizes table
    await queryInterface.removeColumn('Sizes', 'restaurantId');
  },
};
