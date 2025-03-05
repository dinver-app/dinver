'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MenuItemTranslation extends Model {
    static associate(models) {
      MenuItemTranslation.belongsTo(models.MenuItem, {
        foreignKey: 'menuItemId',
        as: 'menuItem',
        onDelete: 'CASCADE',
      });
    }
  }
  MenuItemTranslation.init(
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
      language: {
        type: DataTypes.STRING(2),
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'MenuItemTranslation',
    },
  );
  return MenuItemTranslation;
};
