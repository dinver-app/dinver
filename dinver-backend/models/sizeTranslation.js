'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SizeTranslation extends Model {
    static associate(models) {
      SizeTranslation.belongsTo(models.Size, {
        foreignKey: 'sizeId',
        as: 'size',
        onDelete: 'CASCADE',
      });
    }
  }
  SizeTranslation.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      sizeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Sizes',
          key: 'id',
        },
      },
      language: {
        type: DataTypes.STRING(5),
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'SizeTranslation',
    },
  );
  return SizeTranslation;
};
