'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ReservationMessages', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      reservationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Reservations',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      senderId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      messageType: {
        type: Sequelize.ENUM('text', 'system', 'suggestion', 'action'),
        allowNull: false,
        defaultValue: 'text',
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      readAt: {
        type: Sequelize.DATE,
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

    // Add indexes
    await queryInterface.addIndex('ReservationMessages', ['reservationId']);
    await queryInterface.addIndex('ReservationMessages', ['senderId']);
    await queryInterface.addIndex('ReservationMessages', ['messageType']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ReservationMessages');
  },
};
