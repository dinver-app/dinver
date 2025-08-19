'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserCoupon extends Model {
    static associate(models) {
      // UserCoupon belongs to Coupon
      UserCoupon.belongsTo(models.Coupon, {
        foreignKey: 'couponId',
        as: 'coupon',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      // UserCoupon belongs to User
      UserCoupon.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      // UserCoupon has many CouponRedemptions
      UserCoupon.hasMany(models.CouponRedemption, {
        foreignKey: 'userCouponId',
        as: 'redemptions',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    }
  }

  UserCoupon.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      couponId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Coupons',
          key: 'id',
        },
        comment: 'Coupon this user coupon belongs to',
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        comment: 'User who claimed this coupon',
      },
      claimedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'When the user claimed this coupon',
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'When this user coupon expires (1 year from claim)',
      },
      status: {
        type: DataTypes.ENUM('CLAIMED', 'REDEEMED', 'EXPIRED'),
        allowNull: false,
        defaultValue: 'CLAIMED',
        comment: 'Current status of this user coupon',
      },
      qrTokenHash: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Hash for short-lived QR token',
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
      modelName: 'UserCoupon',
      tableName: 'UserCoupons',
      paranoid: true, // Enable soft deletes
      indexes: [
        {
          fields: ['userId', 'status'],
        },
        {
          fields: ['couponId'],
        },
        {
          fields: ['status'],
        },
        {
          fields: ['expiresAt'],
        },
        {
          fields: ['userId', 'couponId'],
        },
      ],
    },
  );

  return UserCoupon;
};
