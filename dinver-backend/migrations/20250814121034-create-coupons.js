'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Create ENUM types first
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_coupons_source" AS ENUM ('DINVER', 'RESTAURANT');
      CREATE TYPE "enum_coupons_type" AS ENUM ('REWARD_ITEM', 'PERCENT_DISCOUNT', 'FIXED_DISCOUNT', 'GENERIC_REWARD');
      CREATE TYPE "enum_coupons_status" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED');
    `);

    await queryInterface.createTable('Coupons', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      source: {
        type: Sequelize.ENUM('DINVER', 'RESTAURANT'),
        allowNull: false,
      },
      restaurantId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      imageUrl: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM('REWARD_ITEM', 'PERCENT_DISCOUNT', 'FIXED_DISCOUNT', 'GENERIC_REWARD'),
        allowNull: false,
      },
      rewardItemId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'MenuItems',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      percentOff: {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          min: 0,
          max: 100,
        },
      },
      fixedOff: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Fixed discount amount in currency units',
      },
      totalLimit: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Maximum number of claims globally',
      },
      perUserLimit: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      startsAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED'),
        allowNull: false,
        defaultValue: 'DRAFT',
      },
      claimedCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
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

    // Create indexes
    await queryInterface.addIndex('Coupons', ['status', 'expiresAt']);
    await queryInterface.addIndex('Coupons', ['restaurantId']);
    await queryInterface.addIndex('Coupons', ['source']);
    await queryInterface.addIndex('Coupons', ['type']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('Coupons');
    
    // Drop ENUM types
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_coupons_source";
      DROP TYPE IF EXISTS "enum_coupons_type";
      DROP TYPE IF EXISTS "enum_coupons_status";
    `);
  }
};
