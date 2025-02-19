'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert('Allergens', [
      {
        name_en: 'Gluten',
        name_hr: 'Gluten',
        icon: '🌾',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Fish',
        name_hr: 'Riba',
        icon: '🐟',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Shellfish',
        name_hr: 'Školjke',
        icon: '🦪',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Eggs',
        name_hr: 'Jaja',
        icon: '🥚',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Dairy Products (Lactose)',
        name_hr: 'Mliječni proizvodi (laktoza)',
        icon: '🧀',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Nuts',
        name_hr: 'Orašasti plodovi',
        icon: '🌰',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Peanuts',
        name_hr: 'Kikiriki',
        icon: '🥜',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Soy',
        name_hr: 'Soja',
        icon: '🌱',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Sesame',
        name_hr: 'Sezam',
        icon: '⚫',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Celery',
        name_hr: 'Celer',
        icon: '🌿',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Mustard',
        name_hr: 'Gorušica',
        icon: '🌶',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Lupin',
        name_hr: 'Lupina',
        icon: '🫘',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Sulfites',
        name_hr: 'Sulfiti',
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
