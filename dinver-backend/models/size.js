'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Size extends Model {
    static associate(models) {
      Size.hasMany(models.SizeTranslation, {
        foreignKey: 'sizeId',
        as: 'translations',
        onDelete: 'CASCADE',
      });
      Size.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
      Size.belongsToMany(models.MenuItem, {
        through: models.MenuItemSize,
        foreignKey: 'sizeId',
        otherKey: 'menuItemId',
        as: 'menuItems',
      });
    }
  }
  Size.init(
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
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'Size',
    },
  );
  return Size;
};
