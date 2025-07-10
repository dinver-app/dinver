'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MenuCategory extends Model {
    static associate(models) {
      MenuCategory.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant',
      });

      MenuCategory.hasMany(models.MenuItem, {
        foreignKey: 'categoryId',
        as: 'items',
      });

      MenuCategory.hasMany(models.MenuCategoryTranslation, {
        foreignKey: 'menuCategoryId',
        as: 'translations',
        onDelete: 'CASCADE',
      });
    }
  }
  MenuCategory.init(
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
      modelName: 'MenuCategory',
    },
  );
  return MenuCategory;
};
