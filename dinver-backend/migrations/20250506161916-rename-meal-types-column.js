'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    // The previous migration 20250417125158-add-meal-types-and-price-category.js
    // added the column as meal_types, but our code uses camelCase (mealTypes)
    // This migration ensures consistency with the camelCase convention

    // First, check if the old column exists
    const tableInfo = await queryInterface.describeTable('Restaurants');

    if (tableInfo.meal_types) {
      // Rename meal_types to mealTypes
      await queryInterface.renameColumn(
        'Restaurants',
        'meal_types',
        'mealTypes',
      );
    }
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    // Revert the change
    const tableInfo = await queryInterface.describeTable('Restaurants');

    if (tableInfo.mealTypes) {
      await queryInterface.renameColumn(
        'Restaurants',
        'mealTypes',
        'meal_types',
      );
    }
  },
};
