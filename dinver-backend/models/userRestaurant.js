'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserRestaurant extends Model {
    static associate(models) {
      UserRestaurant.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }
  UserRestaurant.init(
    {
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
      permission: {
        type: DataTypes.ENUM('view', 'edit'),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'UserRestaurant',
    },
  );
  return UserRestaurant;
};
