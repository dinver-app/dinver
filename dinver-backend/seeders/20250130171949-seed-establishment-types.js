'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('EstablishmentType', null, {});

    return queryInterface.bulkInsert('EstablishmentType', [
      {
        name: 'Restaurant',
        icon: '🍽',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Cafe',
        icon: '☕',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Pub',
        icon: '🍺',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Bar',
        icon: '🍸',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Nightclub',
        icon: '🕺',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Food Truck',
        icon: '🚚',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Bakery',
        icon: '🍞',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Buffet',
        icon: '🍽',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Bistro',
        icon: '🥖',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Sushi Bar',
        icon: '🍣',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Cocktail Bar',
        icon: '🍸',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Hotel Restaurant',
        icon: '🏨',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Cake Shop',
        icon: '🍰',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Brunch Place',
        icon: '🍳',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Juice & Smoothie Bar',
        icon: '🍹',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('EstablishmentType', null, {});
  },
};
