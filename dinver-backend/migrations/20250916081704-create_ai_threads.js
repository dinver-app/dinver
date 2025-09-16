'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('AiThreads', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      deviceId: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      restaurantId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Restaurants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      isReadOnly: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      messageCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      lastMessageAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Server may purge after this (e.g., 7 days)',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
    await queryInterface.addIndex('AiThreads', ['deviceId', 'restaurantId']);
    await queryInterface.addIndex('AiThreads', ['deviceId', 'createdAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('AiThreads');
  },
};
