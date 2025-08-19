'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CouponRedemption extends Model {
    static associate(models) {
      // CouponRedemption belongs to UserCoupon
      CouponRedemption.belongsTo(models.UserCoupon, {
        foreignKey: 'userCouponId',
        as: 'userCoupon',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      // CouponRedemption belongs to Restaurant
      CouponRedemption.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      // CouponRedemption belongs to User (staff/admin who validated)
      CouponRedemption.belongsTo(models.User, {
        foreignKey: 'redeemedBy',
        as: 'staff',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      });
    }
  }

  CouponRedemption.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userCouponId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'UserCoupons',
          key: 'id',
        },
        comment: 'User coupon that was redeemed',
      },
      restaurantId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
        comment: 'Restaurant where the coupon was redeemed',
      },
      redeemedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'When the coupon was redeemed',
      },
      redeemedBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        comment: 'Staff/admin who validated the redemption',
      },
      meta: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Additional metadata about the redemption',
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Soft delete timestamp',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'CouponRedemption',
      tableName: 'CouponRedemptions',
      paranoid: true, // Enable soft deletes
      indexes: [
        {
          fields: ['restaurantId', 'redeemedAt'],
        },
        {
          fields: ['userCouponId'],
        },
        {
          fields: ['redeemedBy'],
        },
        {
          fields: ['redeemedAt'],
        },
      ],
    },
  );

  return CouponRedemption;
};
