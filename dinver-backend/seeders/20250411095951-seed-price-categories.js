'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('PriceCategories', [
      {
        NameEn: 'Budget Friendly',
        NameHr: 'Pristupačno',
        icon: '€',
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        NameEn: 'Mid-Range',
        NameHr: 'Srednja cijena',
        icon: '€€',
        level: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        NameEn: 'Fine Dining',
        NameHr: 'Visoka kategorija',
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
