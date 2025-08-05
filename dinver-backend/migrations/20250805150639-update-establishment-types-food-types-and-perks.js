'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Remove "Pekarnica" and "Sushi Bar" from EstablishmentTypes
    await queryInterface.bulkDelete('EstablishmentTypes', {
      nameHr: ['Pekarnica', 'Sushi Bar'],
    });

    // 2. Remove "Doručak" from FoodTypes
    await queryInterface.bulkDelete('FoodTypes', {
      nameHr: 'Doručak',
    });

    // 3. Update "Dostupne visoke stolice" to "Dostupne stolice za djecu" in EstablishmentPerks
    await queryInterface.bulkUpdate(
      'EstablishmentPerks',
      {
        nameHr: 'Dostupne stolice za djecu',
        updatedAt: new Date(),
      },
      {
        nameHr: 'Dostupne visoke stolice',
      },
    );

    // 4. Add new perk "Mogućnost kupnje duhanskih proizvoda"
    await queryInterface.bulkInsert('EstablishmentPerks', [
      {
        id: 54, // Using next available ID after air-conditioned space perk (53)
        nameEn: 'Tobacco Products Available',
        nameHr: 'Mogućnost kupnje duhanskih proizvoda',
        icon: '🚬',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    // 1. Restore "Pekarnica" and "Sushi Bar" to EstablishmentTypes
    await queryInterface.bulkInsert('EstablishmentTypes', [
      {
        nameEn: 'Bakery',
        nameHr: 'Pekarnica',
        icon: '🍞',
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
    ]);

    // 2. Restore "Doručak" to FoodTypes
    await queryInterface.bulkInsert('FoodTypes', [
      {
        nameEn: 'Breakfast',
        nameHr: 'Doručak',
        icon: '🍳',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // 3. Revert "Dostupne stolice za djecu" back to "Dostupne visoke stolice"
    await queryInterface.bulkUpdate(
      'EstablishmentPerks',
      {
        nameHr: 'Dostupne visoke stolice',
        updatedAt: new Date(),
      },
      {
        nameHr: 'Dostupne stolice za djecu',
      },
    );

    // 4. Remove the tobacco products perk
    await queryInterface.bulkDelete('EstablishmentPerks', {
      id: 54,
    });
  },
};
