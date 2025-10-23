'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add 'receipt_approved' to the actionType enum
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_UserPointsHistory_actionType" ADD VALUE 'receipt_approved';
    `);
  },

  async down(queryInterface, Sequelize) {
    // Note: PostgreSQL doesn't support removing values from enum types directly
    // This would require recreating the enum type and updating all references
    // For now, we'll leave the enum value in place
    console.log(
      'Cannot remove enum value in PostgreSQL - manual intervention required',
    );
  },
};
