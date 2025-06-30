'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Dodajemo nove vrijednosti u postojeći enum
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_ReservationMessages_messageType" ADD VALUE IF NOT EXISTS 'system';
        ALTER TYPE "enum_ReservationMessages_messageType" ADD VALUE IF NOT EXISTS 'user';
        ALTER TYPE "enum_ReservationMessages_messageType" ADD VALUE IF NOT EXISTS 'suggestion';
      `);
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Ne možemo ukloniti vrijednosti iz enum tipa u PostgreSQL-u
    console.log('Down migration is not supported for removing enum values');
  },
};
