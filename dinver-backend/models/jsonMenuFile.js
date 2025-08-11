'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class JsonMenuFile extends Model {
    static associate(models) {
      // Define associations here
      JsonMenuFile.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant',
      });
    }
  }

  JsonMenuFile.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      restaurantId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
      },
      filename: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      jsonContent: {
        type: DataTypes.JSONB,
        allowNull: false,
        validate: {
          notNull: true,
        },
      },
      menuType: {
        type: DataTypes.ENUM('food', 'drink'),
        allowNull: false,
        defaultValue: 'food',
        validate: {
          isIn: [['food', 'drink']],
        },
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'JsonMenuFile',
      tableName: 'json_menu_files',
      timestamps: true,
      indexes: [
        {
          fields: ['restaurantId'],
        },
        {
          fields: ['filename'],
        },
        {
          fields: ['menuType'],
        },
      ],
    },
  );

  return JsonMenuFile;
};
