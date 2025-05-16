'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Get the IDs of the dietary-related food types
    const foodTypesToRemove = await queryInterface.sequelize.query(
      `SELECT id FROM "FoodTypes" WHERE "nameEn" IN ('Vegetarian', 'Vegan', 'Gluten-Free')`,
      { type: Sequelize.QueryTypes.SELECT },
    );

    // Delete the dietary-related food types
    await queryInterface.bulkDelete('FoodTypes', {
      nameEn: ['Vegetarian', 'Vegan', 'Gluten-Free'],
    });

    // Update restaurants' foodTypes arrays to remove the deleted IDs
    const removedIds = foodTypesToRemove.map((type) => type.id);

    // Get all restaurants
    const restaurants = await queryInterface.sequelize.query(
      `SELECT id, "foodTypes" FROM "Restaurants" WHERE "foodTypes" && ARRAY[${removedIds.join(',')}]::integer[]`,
      { type: Sequelize.QueryTypes.SELECT },
    );

    // Update each restaurant's foodTypes array
    for (const restaurant of restaurants) {
      if (restaurant.foodTypes) {
        const updatedFoodTypes = restaurant.foodTypes.filter(
          (id) => !removedIds.includes(id),
        );
        await queryInterface.sequelize.query(
          `UPDATE "Restaurants" SET "foodTypes" = ARRAY[${updatedFoodTypes.join(',')}]::integer[] WHERE id = :id`,
          {
            replacements: { id: restaurant.id },
            type: Sequelize.QueryTypes.UPDATE,
          },
        );
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Reinsert the removed food types
    await queryInterface.bulkInsert('FoodTypes', [
      {
        nameEn: 'Vegetarian',
        nameHr: 'Vegetarijanska jela',
        icon: '🥦',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Vegan',
        nameHr: 'Veganska jela',
        icon: '🌱',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Gluten-Free',
        nameHr: 'Jela bez glutena',
        icon: '🌾',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },
};
