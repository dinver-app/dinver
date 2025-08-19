'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CouponCondition extends Model {
    static associate(models) {
      // CouponCondition belongs to Coupon
      CouponCondition.belongsTo(models.Coupon, {
        foreignKey: 'couponId',
        as: 'coupon',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      // CouponCondition belongs to Restaurant (optional - for restaurant-specific conditions)
      CouponCondition.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantScopeId',
        as: 'restaurantScope',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
    }
  }

  CouponCondition.init(
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
        comment: 'Coupon this condition belongs to',
      },
      kind: {
        type: DataTypes.ENUM(
          'POINTS_AT_LEAST', 
          'REFERRALS_AT_LEAST', 
          'VISITS_SAME_RESTAURANT_AT_LEAST', 
          'VISITS_DIFFERENT_RESTAURANTS_AT_LEAST', 
          'VISITS_CITIES_AT_LEAST'
        ),
        allowNull: false,
        comment: 'Type of condition',
      },
      valueInt: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Value for the condition (e.g., 100 points, 3 referrals, 5 visits...)',
      },
      restaurantScopeId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
        comment: 'Restaurant ID for VISITS_SAME_RESTAURANT conditions',
      },
    },
    {
      sequelize,
      modelName: 'CouponCondition',
      tableName: 'CouponConditions',
      indexes: [
        {
          fields: ['couponId'],
        },
        {
          fields: ['kind'],
        },
        {
          fields: ['restaurantScopeId'],
        },
      ],
    },
  );

  return CouponCondition;
};
