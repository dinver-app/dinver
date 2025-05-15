const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FoodCategoryClick extends Model {
    static associate(models) {
      // Define associations here if needed
    }
  }
  FoodCategoryClick.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      foodTypeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      clickedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'FoodCategoryClick',
    },
  );
  return FoodCategoryClick;
};
