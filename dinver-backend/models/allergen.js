const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Allergen extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Allergen.belongsToMany(models.Ingredient, {
        through: 'IngredientAllergen',
        foreignKey: 'allergenId',
        as: 'ingredients',
      });
    }
  }
  Allergen.init(
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
    },
    {
      sequelize,
      modelName: 'Allergen',
    },
  );
  return Allergen;
};
