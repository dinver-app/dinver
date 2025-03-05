'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DrinkCategoryTranslation extends Model {
    static associate(models) {
      DrinkCategoryTranslation.belongsTo(models.DrinkCategory, {
        foreignKey: 'drinkCategoryId',
        as: 'drinkCategory',
        onDelete: 'CASCADE',
      });
    }
  }
  DrinkCategoryTranslation.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      drinkCategoryId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'DrinkCategories',
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
      modelName: 'DrinkCategoryTranslation',
    },
  );
  return DrinkCategoryTranslation;
};
