'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('MealTypes', [
      {
        nameEn: 'Breakfast',
        nameHr: 'Doručak',
        icon: '🍳',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        NameEn: 'Brunch',
        NameHr: 'Brunch',
        icon: '🥐',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        NameEn: 'Lunch',
        NameHr: 'Ručak',
        icon: '🍝',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        NameEn: 'Dinner',
        NameHr: 'Večera',
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
