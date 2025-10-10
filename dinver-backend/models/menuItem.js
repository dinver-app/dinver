'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MenuItem extends Model {
    static associate(models) {
      MenuItem.belongsTo(models.MenuCategory, {
        foreignKey: 'categoryId',
        as: 'category',
        onDelete: 'CASCADE',
      });
      MenuItem.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
      MenuItem.hasMany(models.MenuItemTranslation, {
        foreignKey: 'menuItemId',
        as: 'translations',
        onDelete: 'CASCADE',
      });
      MenuItem.hasMany(models.MenuItemSize, {
        foreignKey: 'menuItemId',
        as: 'sizes',
        onDelete: 'CASCADE',
      });
      MenuItem.belongsToMany(models.Size, {
        through: models.MenuItemSize,
        foreignKey: 'menuItemId',
        otherKey: 'sizeId',
        as: 'sizeOptions',
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
      price: {
        type: DataTypes.DECIMAL,
        allowNull: true,
      },
      minPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      maxPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      imageUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      ingredients: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        allowNull: true,
      },
      allergens: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        allowNull: true,
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
      modelName: 'MenuItem',
    },
  );
  return MenuItem;
};
