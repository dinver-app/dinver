'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('MealTypes', [
      {
        name_en: 'Breakfast',
        name_hr: 'Doručak',
        icon: '🍳',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Brunch',
        name_hr: 'Brunch',
        icon: '🥐',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Lunch',
        name_hr: 'Ručak',
        icon: '🍝',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Dinner',
        name_hr: 'Večera',
        icon: '🍽️',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('MealTypes', null, {});
  },
};
