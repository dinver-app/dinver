'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DrinkCategory extends Model {
    static associate(models) {
      DrinkCategory.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant',
      });

      DrinkCategory.hasMany(models.DrinkItem, {
        foreignKey: 'categoryId',
        as: 'items',
      });

      DrinkCategory.hasMany(models.DrinkCategoryTranslation, {
        foreignKey: 'drinkCategoryId',
        as: 'translations',
        onDelete: 'CASCADE',
      });
    }
  }
  DrinkCategory.init(
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
      position: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'DrinkCategory',
    },
  );
  return DrinkCategory;
};
