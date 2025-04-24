'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert('Allergens', [
      {
        nameEn: 'Gluten',
        nameHr: 'Gluten',
        icon: '🌾',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Fish',
        nameHr: 'Riba',
        icon: '🐟',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Shellfish',
        nameHr: 'Školjke',
        icon: '🦪',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Eggs',
        nameHr: 'Jaja',
        icon: '🥚',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Dairy Products (Lactose)',
        nameHr: 'Mliječni proizvodi (laktoza)',
        icon: '🧀',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Nuts',
        nameHr: 'Orašasti plodovi',
        icon: '🌰',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Peanuts',
        nameHr: 'Kikiriki',
        icon: '🥜',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Soy',
        nameHr: 'Soja',
        icon: '🌱',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Sesame',
        nameHr: 'Sezam',
        icon: '⚫',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Celery',
        nameHr: 'Celer',
        icon: '🌿',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Mustard',
        nameHr: 'Gorušica',
        icon: '🌶',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Lupin',
        nameHr: 'Lupina',
        icon: '🫘',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Sulfites',
        nameHr: 'Sulfiti',
        icon: '🍷',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete('Allergens', null, {});
  },
};
