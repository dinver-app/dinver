'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add air-conditioned space establishment perk
    await queryInterface.bulkInsert('EstablishmentPerks', [
      {
        id: 53, // Using next available ID after the parking perks
        nameEn: 'Air-Conditioned Space',
        nameHr: 'Klimatiziran prostor',
        icon: '❄️',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down (queryInterface, Sequelize) {
    // Remove the air-conditioned space perk
    await queryInterface.bulkDelete('EstablishmentPerks', {
      id: 53,
    });
  }
};
