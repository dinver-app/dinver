'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MenuCategoryTranslation extends Model {
    static associate(models) {
      MenuCategoryTranslation.belongsTo(models.MenuCategory, {
        foreignKey: 'menuCategoryId',
        as: 'menuCategory',
        onDelete: 'CASCADE',
      });
    }
  }
  MenuCategoryTranslation.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      menuCategoryId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'MenuCategories',
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
    },
    {
      sequelize,
      modelName: 'MenuCategoryTranslation',
    },
  );
  return MenuCategoryTranslation;
};
