'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('PriceCategories', [
      {
        name_en: 'Budget Friendly',
        name_hr: 'Pristupačno',
        icon: '€',
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Mid-Range',
        name_hr: 'Srednja cijena',
        icon: '€€',
        level: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Fine Dining',
        name_hr: 'Visoka kategorija',
        icon: '€€€',
        level: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('PriceCategories', null, {});
  },
};
