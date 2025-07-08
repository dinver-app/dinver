'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SpecialOffers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      restaurantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      menuItemId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'MenuItems',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      pointsRequired: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      maxRedemptions: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment:
          'Maximum number of times this offer can be redeemed (null = unlimited)',
      },
      currentRedemptions: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      validFrom: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Start date when offer becomes valid (null = immediately)',
      },
      validUntil: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'End date when offer expires (null = never expires)',
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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

    // Add indexes for better performance
    await queryInterface.addIndex('SpecialOffers', ['restaurantId']);
    await queryInterface.addIndex('SpecialOffers', ['menuItemId']);
    await queryInterface.addIndex('SpecialOffers', ['isActive']);
    await queryInterface.addIndex('SpecialOffers', ['validFrom', 'validUntil']);
    await queryInterface.addIndex('SpecialOffers', ['position']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('SpecialOffers');
  },
};
