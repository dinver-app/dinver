'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MenuItemSize extends Model {
    static associate(models) {
      MenuItemSize.belongsTo(models.MenuItem, {
        foreignKey: 'menuItemId',
        as: 'menuItem',
        onDelete: 'CASCADE',
      });
      MenuItemSize.belongsTo(models.Size, {
        foreignKey: 'sizeId',
        as: 'size',
        onDelete: 'CASCADE',
      });
    }
  }
  MenuItemSize.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      menuItemId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'MenuItems',
          key: 'id',
        },
      },
      sizeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Sizes',
          key: 'id',
        },
      },
      price: {
        type: DataTypes.DECIMAL,
        allowNull: false,
      },
      isDefault: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      position: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: 'MenuItemSize',
    },
  );
  return MenuItemSize;
};
