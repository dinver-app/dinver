'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DrinkItemTranslation extends Model {
    static associate(models) {
      DrinkItemTranslation.belongsTo(models.DrinkItem, {
        foreignKey: 'drinkItemId',
        as: 'drinkItem',
        onDelete: 'CASCADE',
      });
    }
  }
  DrinkItemTranslation.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      drinkItemId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'DrinkItems',
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
      modelName: 'DrinkItemTranslation',
    },
  );
  return DrinkItemTranslation;
};
