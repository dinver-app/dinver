'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserAdmin extends Model {
    static associate(models) {
      UserAdmin.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      UserAdmin.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant',
      });
    }
  }
  UserAdmin.init(
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
      role: {
        type: DataTypes.ENUM('owner', 'admin', 'helper'),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'UserAdmin',
    },
  );
  return UserAdmin;
};
