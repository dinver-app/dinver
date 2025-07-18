'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RestaurantClick extends Model {
    static associate(models) {
      RestaurantClick.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      RestaurantClick.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant',
      });
    }
  }

  RestaurantClick.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      restaurantId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      city: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      isPromo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: 'RestaurantClick',
      tableName: 'RestaurantClicks',
    },
  );

  return RestaurantClick;
};
