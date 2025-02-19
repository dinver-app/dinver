'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert('Ingredients', [
      {
        name_en: 'Meat',
        name_hr: 'Meso',
        icon: '🥩',
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
        name_en: 'Mushrooms',
        name_hr: 'Gljive',
        icon: '🍄',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Dairy Products',
        name_hr: 'Mliječni proizvodi',
        icon: '🧀',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Vegetables',
        name_hr: 'Povrće',
        icon: '🍅',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Fruits',
        name_hr: 'Voće',
        icon: '🍏',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Grains',
        name_hr: 'Žitarice',
        icon: '🌾',
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
        name_en: 'Sauces',
        name_hr: 'Umaci',
        icon: '🍶',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete('Ingredients', null, {});
  },
};
