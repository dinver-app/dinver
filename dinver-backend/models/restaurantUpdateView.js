'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RestaurantUpdateView extends Model {
    static associate(models) {
      RestaurantUpdateView.belongsTo(models.RestaurantUpdate, {
        foreignKey: 'updateId',
        as: 'update',
      });

      RestaurantUpdateView.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }

  RestaurantUpdateView.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      updateId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'RestaurantUpdates',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true, // null for anonymous users
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
    },
    {
      sequelize,
      modelName: 'RestaurantUpdateView',
      tableName: 'RestaurantUpdateViews',
      updatedAt: false, // Only need createdAt for views
      indexes: [
        {
          fields: ['updateId'],
        },
        {
          fields: ['userId'],
        },
        {
          fields: ['createdAt'],
        },
        {
          // One view per user per update (for logged-in users)
          unique: true,
          fields: ['updateId', 'userId'],
          where: {
            userId: {
              [require('sequelize').Op.ne]: null,
            },
          },
          name: 'restaurant_update_views_unique_user_idx',
        },
      ],
    },
  );

  return RestaurantUpdateView;
};
