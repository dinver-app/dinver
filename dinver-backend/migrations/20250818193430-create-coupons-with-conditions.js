'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create ENUM types first (only if they don't exist)
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_Coupons_source" AS ENUM ('DINVER', 'RESTAURANT');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_Coupons_type" AS ENUM ('REWARD_ITEM', 'PERCENT_DISCOUNT', 'FIXED_DISCOUNT');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_Coupons_status" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_Coupons_conditionKind" AS ENUM ('POINTS_AT_LEAST', 'REFERRALS_AT_LEAST', 'VISITS_DIFFERENT_RESTAURANTS_AT_LEAST', 'VISITS_CITIES_AT_LEAST');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create Coupons table
    await queryInterface.createTable('Coupons', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      source: {
        type: Sequelize.ENUM('DINVER', 'RESTAURANT'),
        allowNull: false,
        comment: 'Whether this is a system-wide or restaurant-specific coupon',
      },
      restaurantId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
        comment: 'Restaurant ID for restaurant-specific coupons',
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Coupon title',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Coupon description',
      },
      imageUrl: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Coupon image URL',
      },
      type: {
        type: Sequelize.ENUM(
          'REWARD_ITEM',
          'PERCENT_DISCOUNT',
          'FIXED_DISCOUNT',
        ),
        allowNull: false,
        comment: 'Type of coupon reward',
      },
      rewardItemId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'MenuItems',
          key: 'id',
        },
        comment: 'Menu item ID for reward item coupons',
      },
      percentOff: {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          min: 0,
          max: 100,
        },
        comment: 'Percentage discount (0-100)',
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
        comment: 'Maximum number of claims per user',
      },
      startsAt: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'When the coupon becomes available',
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'When the coupon expires',
      },
      status: {
        type: Sequelize.ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED'),
        allowNull: false,
        defaultValue: 'DRAFT',
        comment: 'Current status of the coupon',
      },
      claimedCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of times this coupon has been claimed',
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        comment: 'User who created this coupon',
      },
      // Condition fields directly in the table
      conditionKind: {
        type: Sequelize.ENUM(
          'POINTS_AT_LEAST',
          'REFERRALS_AT_LEAST',
          'VISITS_DIFFERENT_RESTAURANTS_AT_LEAST',
          'VISITS_CITIES_AT_LEAST',
        ),
        allowNull: true,
        comment: 'Type of condition for the coupon',
      },
      conditionValue: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment:
          'Value for the condition (e.g., minimum points, referrals, visits)',
      },
      conditionRestaurantScopeId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
        comment: 'Restaurant scope for condition (if applicable)',
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Soft delete timestamp',
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

    // Add indexes
    await queryInterface.addIndex('Coupons', ['status', 'expiresAt']);
    await queryInterface.addIndex('Coupons', ['restaurantId']);
    await queryInterface.addIndex('Coupons', ['deletedAt']);
    await queryInterface.addIndex('Coupons', ['source', 'deletedAt']);
    await queryInterface.addIndex('Coupons', ['type']);
  },

  async down(queryInterface, Sequelize) {
    // Drop the table
    await queryInterface.dropTable('Coupons');

    // Drop ENUM types
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Coupons_source";',
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Coupons_type";',
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Coupons_status";',
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Coupons_conditionKind";',
    );
  },
};
