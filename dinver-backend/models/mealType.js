'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class MealType extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Define associations here if needed
    }
  }
  MealType.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name_en: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      name_hr: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      icon: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'MealType',
    },
  );
  return MealType;
};
