'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add 'claude' to the ocrMethod enum
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Receipts_ocrMethod" ADD VALUE IF NOT EXISTS 'claude';
    `);
  },

  async down(queryInterface, Sequelize) {
    // Note: PostgreSQL doesn't support removing enum values directly
    // To revert, you would need to recreate the enum type
    console.log('Cannot remove enum value in PostgreSQL. Manual intervention required if rollback needed.');
  }
};
