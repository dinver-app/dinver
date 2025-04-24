'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserFavorite extends Model {
    static associate(models) {}
  }

  UserFavorite.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
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
    },
    {
      sequelize,
      modelName: 'UserFavorite',
      tableName: 'UserFavorites',
    },
  );

  return UserFavorite;
};
