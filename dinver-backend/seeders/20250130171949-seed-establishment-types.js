'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, delete all existing establishment types
    // await queryInterface.bulkDelete('EstablishmentTypes', null, {}); // TODO - remove after revision

    // Then, insert the new establishment types
    return queryInterface.bulkInsert('EstablishmentTypes', [
      {
        nameEn: 'Restaurant',
        nameHr: 'Restoran',
        icon: '🍽',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Cafe',
        nameHr: 'Kafić',
        icon: '☕',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Pub',
        nameHr: 'Pub',
        icon: '🍺',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Bar',
        nameHr: 'Bar',
        icon: '🍸',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Nightclub',
        nameHr: 'Noćni klub',
        icon: '🕺',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Food Truck',
        nameHr: 'Food Truck',
        icon: '🚚',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Bakery',
        nameHr: 'Pekarnica',
        icon: '🍞',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Buffet',
        nameHr: 'Bife',
        icon: '🍽',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Bistro',
        nameHr: 'Bistro',
        icon: '🥖',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Sushi Bar',
        nameHr: 'Sushi Bar',
        icon: '🍣',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Cocktail Bar',
        nameHr: 'Koktel bar',
        icon: '🍸',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Hotel Restaurant',
        nameHr: 'Restoran u hotelu',
        icon: '🏨',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Cake Shop',
        nameHr: 'Slastičarnica',
        icon: '🍰',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Brunch Place',
        nameHr: 'Brunch Place',
        icon: '🍳',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameEn: 'Juice & Smoothie Bar',
        nameHr: 'Juice & Smoothie Bar',
        icon: '🍹',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('EstablishmentTypes', null, {});
  },
};
