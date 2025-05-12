'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create new SearchHistory table
    await queryInterface.createTable('SearchHistory', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      searchTerm: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
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

    // Add index for faster queries
    await queryInterface.addIndex('SearchHistory', ['userId']);
    await queryInterface.addIndex('SearchHistory', ['timestamp']);

    // Remove searchHistory column from UserSettings
    await queryInterface.removeColumn('UserSettings', 'searchHistory');
  },

  down: async (queryInterface, Sequelize) => {
    // Add back searchHistory column to UserSettings
    await queryInterface.addColumn('UserSettings', 'searchHistory', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    });

    // Drop SearchHistory table
    await queryInterface.dropTable('SearchHistory');
  },
};
