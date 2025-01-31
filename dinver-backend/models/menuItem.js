'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MenuItem extends Model {
    static associate(models) {
      MenuItem.belongsTo(models.MenuCategory, {
        foreignKey: 'categoryId',
        as: 'category',
      });
      MenuItem.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    }
  }
  MenuItem.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      categoryId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'MenuCategories',
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
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      price: {
        type: DataTypes.DECIMAL,
        allowNull: false,
      },
      imageUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      ingredients: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      allergens: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'MenuItem',
    },
  );
  return MenuItem;
};
