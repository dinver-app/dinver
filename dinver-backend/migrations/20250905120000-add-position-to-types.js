'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add position to various type tables
    await queryInterface.addColumn('FoodTypes', 'position', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('EstablishmentTypes', 'position', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('EstablishmentPerks', 'position', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('MealTypes', 'position', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('DietaryTypes', 'position', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('FoodTypes', 'position');
    await queryInterface.removeColumn('EstablishmentTypes', 'position');
    await queryInterface.removeColumn('EstablishmentPerks', 'position');
    await queryInterface.removeColumn('MealTypes', 'position');
    await queryInterface.removeColumn('DietaryTypes', 'position');
  },
};
