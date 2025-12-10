'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('GoogleApiLogs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      // API type: 'nearby_search', 'text_search', 'place_details'
      apiType: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      // Location info
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true,
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true,
      },
      place: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      country: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      // Search parameters
      query: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      radiusMeters: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      // Results
      resultsCount: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      importedCount: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      // Cost tracking
      costUsd: {
        type: Sequelize.DECIMAL(10, 6),
        allowNull: false,
        defaultValue: 0,
      },
      // Context
      triggeredBy: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      triggerReason: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      // Optional user tracking
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      // Response status
      success: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      // Timestamps
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Indexes for fast querying
    await queryInterface.addIndex('GoogleApiLogs', ['apiType'], {
      name: 'idx_google_api_logs_api_type',
    });
    await queryInterface.addIndex('GoogleApiLogs', ['createdAt'], {
      name: 'idx_google_api_logs_created_at',
    });
    await queryInterface.addIndex('GoogleApiLogs', ['country'], {
      name: 'idx_google_api_logs_country',
    });
    await queryInterface.addIndex('GoogleApiLogs', ['triggeredBy'], {
      name: 'idx_google_api_logs_triggered_by',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('GoogleApiLogs');
  },
};
