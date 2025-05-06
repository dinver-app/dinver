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
        nameEn: 'Brunch',
        nameHr: 'Brunch',
        icon: '🥐',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Lunch',
        nameHr: 'Ručak',
        icon: '🍝',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Dinner',
        nameHr: 'Večera',
        icon: '🍽️',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Late Night',
        nameHr: 'Kasna večera',
        icon: '🌙',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Drinks',
        nameHr: 'Piće',
        icon: '🍹',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('MealTypes', null, {});
  },
};
