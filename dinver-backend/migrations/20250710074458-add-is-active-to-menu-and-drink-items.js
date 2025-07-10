'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Dodaj isActive polje za MenuItem
    await queryInterface.addColumn('MenuItems', 'isActive', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    // Dodaj isActive polje za MenuCategory
    await queryInterface.addColumn('MenuCategories', 'isActive', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    // Dodaj isActive polje za DrinkItem
    await queryInterface.addColumn('DrinkItems', 'isActive', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    // Dodaj isActive polje za DrinkCategory
    await queryInterface.addColumn('DrinkCategories', 'isActive', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // Ukloni isActive polje iz svih tablica
    await queryInterface.removeColumn('MenuItems', 'isActive');
    await queryInterface.removeColumn('MenuCategories', 'isActive');
    await queryInterface.removeColumn('DrinkItems', 'isActive');
    await queryInterface.removeColumn('DrinkCategories', 'isActive');
  },
};
