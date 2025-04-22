'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Reservations', 'suggestedDate', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });

    await queryInterface.addColumn('Reservations', 'suggestedTime', {
      type: Sequelize.TIME,
      allowNull: true,
    });

    // Dodajemo i kolonu za praćenje kada je restoran odgovorio na rezervaciju
    await queryInterface.addColumn('Reservations', 'respondedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Reservations', 'suggestedDate');
    await queryInterface.removeColumn('Reservations', 'suggestedTime');
    await queryInterface.removeColumn('Reservations', 'respondedAt');
  },
};
