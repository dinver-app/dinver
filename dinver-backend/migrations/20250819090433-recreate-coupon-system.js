'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop all coupon-related tables in correct order (due to foreign key constraints)
    await queryInterface.dropTable('CouponRedemptions', { force: true });
    await queryInterface.dropTable('UserCoupons', { force: true });
    await queryInterface.dropTable('Coupons', { force: true });

    // Drop ENUM types
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_Coupons_source" CASCADE;
      DROP TYPE IF EXISTS "enum_Coupons_type" CASCADE;
      DROP TYPE IF EXISTS "enum_Coupons_status" CASCADE;
      DROP TYPE IF EXISTS "enum_Coupons_conditionKind" CASCADE;
      DROP TYPE IF EXISTS "enum_UserCoupons_status" CASCADE;
    `);

    // Recreate ENUM types
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_Coupons_source" AS ENUM ('DINVER', 'RESTAURANT');
      CREATE TYPE "enum_Coupons_type" AS ENUM ('REWARD_ITEM', 'PERCENT_DISCOUNT', 'FIXED_DISCOUNT');
      CREATE TYPE "enum_Coupons_status" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED');
      CREATE TYPE "enum_Coupons_conditionKind" AS ENUM ('POINTS_AT_LEAST', 'REFERRALS_AT_LEAST', 'VISITS_DIFFERENT_RESTAURANTS_AT_LEAST', 'VISITS_CITIES_AT_LEAST');
      CREATE TYPE "enum_UserCoupons_status" AS ENUM ('CLAIMED', 'REDEEMED', 'EXPIRED');
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
        allowNull: true,
        comment:
          'When the coupon becomes available (nullable if using totalLimit)',
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the coupon expires (nullable if using totalLimit)',
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
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create UserCoupons table
    await queryInterface.createTable('UserCoupons', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      couponId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Coupons',
          key: 'id',
        },
        comment: 'Reference to the coupon',
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        comment: 'Reference to the user',
      },
      claimedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'When the coupon was claimed',
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'When the user coupon expires',
      },
      status: {
        type: Sequelize.ENUM('CLAIMED', 'REDEEMED', 'EXPIRED'),
        allowNull: false,
        defaultValue: 'CLAIMED',
        comment: 'Current status of the user coupon',
      },
      qrTokenHash: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'QR code token hash for redemption',
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Soft delete timestamp',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create CouponRedemptions table
    await queryInterface.createTable('CouponRedemptions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userCouponId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'UserCoupons',
          key: 'id',
        },
        comment: 'Reference to the user coupon',
      },
      restaurantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
        comment: 'Restaurant where the coupon was redeemed',
      },
      redeemedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'When the coupon was redeemed',
      },
      redeemedBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        comment: 'Staff member who redeemed the coupon',
      },
      meta: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional metadata about the redemption',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes
    await queryInterface.addIndex('Coupons', ['status', 'expiresAt']);
    await queryInterface.addIndex('Coupons', ['restaurantId']);
    await queryInterface.addIndex('Coupons', ['deletedAt']);
    await queryInterface.addIndex('Coupons', ['source', 'deletedAt']);
    await queryInterface.addIndex('Coupons', ['type']);

    await queryInterface.addIndex('UserCoupons', ['couponId']);
    await queryInterface.addIndex('UserCoupons', ['userId']);
    await queryInterface.addIndex('UserCoupons', ['status']);
    await queryInterface.addIndex('UserCoupons', ['qrTokenHash']);

    await queryInterface.addIndex('CouponRedemptions', ['userCouponId']);
    await queryInterface.addIndex('CouponRedemptions', ['restaurantId']);
    await queryInterface.addIndex('CouponRedemptions', ['redeemedAt']);
  },

  async down(queryInterface, Sequelize) {
    // Drop tables in reverse order
    await queryInterface.dropTable('CouponRedemptions');
    await queryInterface.dropTable('UserCoupons');
    await queryInterface.dropTable('Coupons');

    // Drop ENUM types
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_Coupons_source" CASCADE;
      DROP TYPE IF EXISTS "enum_Coupons_type" CASCADE;
      DROP TYPE IF EXISTS "enum_Coupons_status" CASCADE;
      DROP TYPE IF EXISTS "enum_Coupons_conditionKind" CASCADE;
      DROP TYPE IF EXISTS "enum_UserCoupons_status" CASCADE;
    `);
  },
};
