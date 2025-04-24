'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert('Ingredients', [
      {
        nameEn: 'Meat',
        nameHr: 'Meso',
        icon: '🥩',
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
        nameEn: 'Mushrooms',
        nameHr: 'Gljive',
        icon: '🍄',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Dairy Products',
        nameHr: 'Mliječni proizvodi',
        icon: '🧀',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Vegetables',
        nameHr: 'Povrće',
        icon: '🍅',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Fruits',
        nameHr: 'Voće',
        icon: '🍏',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Grains',
        nameHr: 'Žitarice',
        icon: '🌾',
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
        nameEn: 'Sauces',
        nameHr: 'Umaci',
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
