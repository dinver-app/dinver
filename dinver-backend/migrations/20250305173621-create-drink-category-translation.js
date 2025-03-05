'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('DrinkCategoryTranslations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      drinkCategoryId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'DrinkCategories',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      language: {
        type: Sequelize.STRING(2),
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('DrinkCategoryTranslations', [
      'drinkCategoryId',
      'language',
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('DrinkCategoryTranslations');
  },
};
