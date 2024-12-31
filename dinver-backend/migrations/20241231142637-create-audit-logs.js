'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('AuditLogs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      restaurant_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
      },
      action: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      entity: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      entity_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      changes: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      timestamp: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('AuditLogs');
  },
};
