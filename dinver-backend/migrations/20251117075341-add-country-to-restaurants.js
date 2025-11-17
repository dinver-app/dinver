'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add country column to Restaurants table
    await queryInterface.addColumn('Restaurants', 'country', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // Set all existing restaurants to Croatia
    await queryInterface.sequelize.query(
      `UPDATE "Restaurants" SET country = 'Croatia' WHERE country IS NULL;`
    );
  },

  async down (queryInterface, Sequelize) {
    // Remove country column
    await queryInterface.removeColumn('Restaurants', 'country');
  }
};
