'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Coupon extends Model {
    static associate(models) {
      // Coupon belongs to Restaurant (optional - for restaurant-specific coupons)
      Coupon.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });

      // Coupon belongs to MenuItem (optional - for reward item coupons)
      Coupon.belongsTo(models.MenuItem, {
        foreignKey: 'rewardItemId',
        as: 'menuItem',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });

      // Coupon belongs to DrinkItem (optional - for reward drink coupons)
      Coupon.belongsTo(models.DrinkItem, {
        foreignKey: 'rewardItemId',
        as: 'drinkItem',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });

      // Coupon belongs to User (who created it)
      Coupon.belongsTo(models.User, {
        foreignKey: 'createdBy',
        as: 'creator',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      });

      // Coupon has many UserCoupons
      Coupon.hasMany(models.UserCoupon, {
        foreignKey: 'couponId',
        as: 'userCoupons',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    }
  }

  Coupon.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      source: {
        type: DataTypes.ENUM('DINVER', 'RESTAURANT'),
        allowNull: false,
        comment: 'Whether this is a system-wide or restaurant-specific coupon',
      },
      restaurantId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
        comment: 'Restaurant ID for restaurant-specific coupons',
      },

      type: {
        type: DataTypes.ENUM(
          'REWARD_ITEM',
          'PERCENT_DISCOUNT',
          'FIXED_DISCOUNT',
        ),
        allowNull: false,
        comment: 'Type of coupon reward',
      },
      rewardItemId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'MenuItems',
          key: 'id',
        },
        comment: 'Menu item ID for reward item coupons',
      },
      percentOff: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 0,
          max: 100,
        },
        comment: 'Percentage discount (0-100)',
      },
      fixedOff: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Fixed discount amount in currency units',
      },
      totalLimit: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Maximum number of claims globally',
      },
      perUserLimit: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Maximum number of claims per user',
      },
      startsAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment:
          'When the coupon becomes available (nullable if using totalLimit)',
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the coupon expires (nullable if using totalLimit)',
      },
      status: {
        type: DataTypes.ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED'),
        allowNull: false,
        defaultValue: 'DRAFT',
        comment: 'Current status of the coupon',
      },
      claimedCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of times this coupon has been claimed',
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        comment: 'User who created this coupon',
      },
      // Condition fields directly in the table
      conditionKind: {
        type: DataTypes.ENUM(
          'POINTS_AT_LEAST',
          'REFERRALS_AT_LEAST',
          'VISITS_SAME_RESTAURANT_AT_LEAST',
          'VISITS_DIFFERENT_RESTAURANTS_AT_LEAST',
          'VISITS_CITIES_AT_LEAST',
        ),
        allowNull: true,
        comment: 'Type of condition for the coupon',
      },
      conditionValue: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment:
          'Value for the condition (e.g., minimum points, referrals, visits)',
      },
      conditionRestaurantScopeId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
        comment: 'Restaurant scope for condition (if applicable)',
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Soft delete timestamp',
      },
    },
    {
      sequelize,
      modelName: 'Coupon',
      tableName: 'Coupons',
      paranoid: true, // Enable soft deletes
      indexes: [
        {
          fields: ['status', 'expiresAt'],
        },
        {
          fields: ['restaurantId'],
        },
        {
          fields: ['deletedAt'],
        },
        {
          fields: ['source', 'deletedAt'],
        },
        {
          fields: ['type'],
        },
      ],
    },
  );

  return Coupon;
};
