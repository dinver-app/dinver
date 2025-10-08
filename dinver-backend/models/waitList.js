'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class WaitList extends Model {
    static associate(models) {
      // No associations needed for wait list
    }
  }

  WaitList.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },
      city: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      restaurantName: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          notEmpty: function (value) {
            if (this.type === 'restaurant' && !value) {
              throw new Error(
                'Restaurant name is required for restaurant type',
              );
            }
          },
        },
      },
      type: {
        type: DataTypes.ENUM('user', 'restaurant'),
        allowNull: false,
        validate: {
          isIn: [['user', 'restaurant']],
        },
      },
    },
    {
      sequelize,
      modelName: 'WaitList',
      tableName: 'WaitList',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['email'],
        },
      ],
    },
  );

  return WaitList;
};
