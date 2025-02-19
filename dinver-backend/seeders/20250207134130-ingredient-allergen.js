'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Fetch ingredient IDs
    const [
      meat,
      fish,
      mushrooms,
      dairy,
      vegetables,
      fruits,
      grains,
      eggs,
      sauces,
    ] = await Promise.all([
      queryInterface.rawSelect('Ingredients', { where: { name_en: 'Meat' } }, [
        'id',
      ]),
      queryInterface.rawSelect('Ingredients', { where: { name_en: 'Fish' } }, [
        'id',
      ]),
      queryInterface.rawSelect(
        'Ingredients',
        { where: { name_en: 'Mushrooms' } },
        ['id'],
      ),
      queryInterface.rawSelect(
        'Ingredients',
        { where: { name_en: 'Dairy Products' } },
        ['id'],
      ),
      queryInterface.rawSelect(
        'Ingredients',
        { where: { name_en: 'Vegetables' } },
        ['id'],
      ),
      queryInterface.rawSelect(
        'Ingredients',
        { where: { name_en: 'Fruits' } },
        ['id'],
      ),
      queryInterface.rawSelect(
        'Ingredients',
        { where: { name_en: 'Grains' } },
        ['id'],
      ),
      queryInterface.rawSelect('Ingredients', { where: { name_en: 'Eggs' } }, [
        'id',
      ]),
      queryInterface.rawSelect(
        'Ingredients',
        { where: { name_en: 'Sauces' } },
        ['id'],
      ),
    ]);

    // Fetch allergen IDs
    const [gluten, fish_allergen, eggs_allergen, dairy_allergen, sesame] =
      await Promise.all([
        queryInterface.rawSelect(
          'Allergens',
          { where: { name_en: 'Gluten' } },
          ['id'],
        ),
        queryInterface.rawSelect('Allergens', { where: { name_en: 'Fish' } }, [
          'id',
        ]),
        queryInterface.rawSelect('Allergens', { where: { name_en: 'Eggs' } }, [
          'id',
        ]),
        queryInterface.rawSelect(
          'Allergens',
          { where: { name_en: 'Dairy Products (Lactose)' } },
          ['id'],
        ),
        queryInterface.rawSelect(
          'Allergens',
          { where: { name_en: 'Sesame' } },
          ['id'],
        ),
      ]);

    return queryInterface.bulkInsert('IngredientAllergens', [
      {
        id: uuidv4(),
        ingredientId: grains,
        allergenId: gluten,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        ingredientId: fish,
        allergenId: fish_allergen,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        ingredientId: eggs,
        allergenId: eggs_allergen,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        ingredientId: dairy,
        allergenId: dairy_allergen,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        ingredientId: sauces,
        allergenId: sesame,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete('IngredientAllergens', null, {});
  },
};
