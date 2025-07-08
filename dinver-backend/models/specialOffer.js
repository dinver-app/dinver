'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SpecialOffer extends Model {
    static associate(models) {
      SpecialOffer.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      SpecialOffer.belongsTo(models.MenuItem, {
        foreignKey: 'menuItemId',
        as: 'menuItem',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    }
  }

  SpecialOffer.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      restaurantId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
      },
      menuItemId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'MenuItems',
          key: 'id',
        },
      },
      pointsRequired: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      maxRedemptions: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment:
          'Maximum number of times this offer can be redeemed (null = unlimited)',
      },
      currentRedemptions: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      validFrom: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Start date when offer becomes valid (null = immediately)',
      },
      validUntil: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'End date when offer expires (null = never expires)',
      },
      position: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: 'SpecialOffer',
      tableName: 'SpecialOffers',
    },
  );
  return SpecialOffer;
};
