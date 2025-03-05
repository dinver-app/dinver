'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('DrinkItemTranslations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      drinkItemId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'DrinkItems',
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
      description: {
        type: Sequelize.STRING,
        allowNull: true,
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

    await queryInterface.addIndex('DrinkItemTranslations', [
      'drinkItemId',
      'language',
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('DrinkItemTranslations');
  },
};
