'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, delete all existing establishment types
    // await queryInterface.bulkDelete('EstablishmentTypes', null, {}); // TODO - remove after revision

    // Then, insert the new establishment types
    return queryInterface.bulkInsert('EstablishmentTypes', [
      {
        name_en: 'Restaurant',
        name_hr: 'Restoran',
        icon: '🍽',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Cafe',
        name_hr: 'Kafić',
        icon: '☕',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Pub',
        name_hr: 'Pub',
        icon: '🍺',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Bar',
        name_hr: 'Bar',
        icon: '🍸',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Nightclub',
        name_hr: 'Noćni klub',
        icon: '🕺',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Food Truck',
        name_hr: 'Food Truck',
        icon: '🚚',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Bakery',
        name_hr: 'Pekarnica',
        icon: '🍞',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Buffet',
        name_hr: 'Bife',
        icon: '🍽',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Bistro',
        name_hr: 'Bistro',
        icon: '🥖',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Sushi Bar',
        name_hr: 'Sushi Bar',
        icon: '🍣',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Cocktail Bar',
        name_hr: 'Koktel bar',
        icon: '🍸',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Hotel Restaurant',
        name_hr: 'Restoran u hotelu',
        icon: '🏨',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Cake Shop',
        name_hr: 'Slastičarnica',
        icon: '🍰',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Brunch Place',
        name_hr: 'Brunch Place',
        icon: '🍳',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name_en: 'Juice & Smoothie Bar',
        name_hr: 'Juice & Smoothie Bar',
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
