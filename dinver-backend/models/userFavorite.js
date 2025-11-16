'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserFavorite extends Model {
    static associate(models) {
      UserFavorite.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant',
      });

      UserFavorite.belongsTo(models.Visit, {
        foreignKey: 'removedForVisitId',
        as: 'visit',
      });
    }
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
      removedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      removedForVisitId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Visits',
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
