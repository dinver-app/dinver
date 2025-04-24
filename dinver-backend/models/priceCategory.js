'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PriceCategory extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Define associations here if needed
    }
  }
  PriceCategory.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      nameEn: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      nameHr: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      icon: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      level: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'PriceCategory',
    },
  );
  return PriceCategory;
};
