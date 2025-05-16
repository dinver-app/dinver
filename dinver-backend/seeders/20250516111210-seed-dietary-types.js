'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert('DietaryTypes', [
      {
        nameEn: 'Vegetarian',
        nameHr: 'Vegetarijanski',
        icon: '🥬',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Vegan',
        nameHr: 'Veganski',
        icon: '🌱',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Gluten-Free',
        nameHr: 'Bez glutena',
        icon: '🌾',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Halal',
        nameHr: 'Halal',
        icon: '🕌',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete('DietaryTypes', null, {});
  },
};
