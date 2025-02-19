'use strict';
module.exports = (sequelize, DataTypes) => {
  const IngredientAllergen = sequelize.define('IngredientAllergen', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ingredientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Ingredients',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    allergenId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Allergens',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
  });

  return IngredientAllergen;
};
