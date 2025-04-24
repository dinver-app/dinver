'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Insight extends Model {
    static associate(models) {
      Insight.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });

      Insight.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant',
      });

      Insight.belongsTo(models.MenuItem, {
        foreignKey: 'menuItemId',
        as: 'menuItem',
      });
    }
  }
  Insight.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
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
        allowNull: true,
        references: {
          model: 'MenuItems',
          key: 'id',
        },
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Insight',
    },
  );
  return Insight;
};
