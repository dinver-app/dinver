'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Reservations', 'noteFromUser', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn('Reservations', 'noteFromOwner', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Reservations', 'noteFromUser');
    await queryInterface.removeColumn('Reservations', 'noteFromOwner');
  },
};
