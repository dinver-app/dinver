'use strict';

const crypto = require('crypto');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Get all restaurants with custom working days
    const restaurants = await queryInterface.sequelize.query(
      `SELECT id, "customWorkingDays" FROM "Restaurants" WHERE "customWorkingDays" IS NOT NULL`,
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    // Update each restaurant's custom working days to include IDs
    for (const restaurant of restaurants) {
      if (
        restaurant.customWorkingDays &&
        restaurant.customWorkingDays.customWorkingDays
      ) {
        const updatedDays = restaurant.customWorkingDays.customWorkingDays.map(
          (day) => ({
            ...day,
            id: crypto.randomUUID(),
          }),
        );

        await queryInterface.sequelize.query(
          `UPDATE "Restaurants" SET "customWorkingDays" = :customWorkingDays::jsonb WHERE id = :id`,
          {
            replacements: {
              id: restaurant.id,
              customWorkingDays: JSON.stringify({
                customWorkingDays: updatedDays,
              }),
            },
            type: queryInterface.sequelize.QueryTypes.UPDATE,
          },
        );
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Get all restaurants with custom working days
    const restaurants = await queryInterface.sequelize.query(
      `SELECT id, "customWorkingDays" FROM "Restaurants" WHERE "customWorkingDays" IS NOT NULL`,
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    // Remove IDs from each restaurant's custom working days
    for (const restaurant of restaurants) {
      if (
        restaurant.customWorkingDays &&
        restaurant.customWorkingDays.customWorkingDays
      ) {
        const updatedDays = restaurant.customWorkingDays.customWorkingDays.map(
          (day) => {
            const { id, ...dayWithoutId } = day;
            return dayWithoutId;
          },
        );

        await queryInterface.sequelize.query(
          `UPDATE "Restaurants" SET "customWorkingDays" = :customWorkingDays::jsonb WHERE id = :id`,
          {
            replacements: {
              id: restaurant.id,
              customWorkingDays: JSON.stringify({
                customWorkingDays: updatedDays,
              }),
            },
            type: queryInterface.sequelize.QueryTypes.UPDATE,
          },
        );
      }
    }
  },
};
