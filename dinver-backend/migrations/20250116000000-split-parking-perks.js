'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, delete the existing "Parking Available" perk (ID 31)
    await queryInterface.bulkDelete('EstablishmentPerks', { id: 31 });

    // Insert two new parking perks
    await queryInterface.bulkInsert('EstablishmentPerks', [
      {
        id: 31,
        nameEn: 'Free Parking',
        nameHr: 'Besplatni parking',
        icon: '🅿️',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 52, // Using next available ID
        nameEn: 'Paid Parking',
        nameHr: 'Plaćeni parking',
        icon: '💰',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    // Delete the new parking perks
    await queryInterface.bulkDelete('EstablishmentPerks', {
      id: { [Sequelize.Op.in]: [31, 52] },
    });

    // Restore the original "Parking Available" perk
    await queryInterface.bulkInsert('EstablishmentPerks', [
      {
        id: 31,
        nameEn: 'Parking Available',
        nameHr: 'Dostupan parking',
        icon: '🚗',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },
};
