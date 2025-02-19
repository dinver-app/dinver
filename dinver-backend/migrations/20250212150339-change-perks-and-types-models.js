'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop existing tables
    await queryInterface.dropTable('EstablishmentPerks');
    await queryInterface.dropTable('EstablishmentTypes');
    await queryInterface.dropTable('FoodTypes');

    // Recreate EstablishmentPerks table with new fields
    await queryInterface.createTable('EstablishmentPerks', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name_en: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      name_hr: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      icon: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Recreate EstablishmentTypes table with new fields
    await queryInterface.createTable('EstablishmentTypes', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name_en: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      name_hr: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      icon: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Recreate FoodTypes table with new fields
    await queryInterface.createTable('FoodTypes', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name_en: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      name_hr: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      icon: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop the tables
    await queryInterface.dropTable('EstablishmentPerks');
    await queryInterface.dropTable('EstablishmentTypes');
    await queryInterface.dropTable('FoodTypes');
  },
};
