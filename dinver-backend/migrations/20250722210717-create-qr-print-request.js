'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('QRPrintRequests', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
      },
      restaurantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Restaurants', key: 'id' },
        onDelete: 'CASCADE',
      },
      showDinverLogo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },
      showRestaurantName: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },
      showScanText: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },
      textPosition: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      qrTextColor: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      qrBackgroundColor: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      qrBorderColor: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      qrBorderWidth: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      padding: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'printed', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('QRPrintRequests');
  },
};
