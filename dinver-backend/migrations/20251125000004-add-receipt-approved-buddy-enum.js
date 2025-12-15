'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Add 'receipt_approved_buddy' to the actionType ENUM
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_UserPointsHistory_actionType"
      ADD VALUE IF NOT EXISTS 'receipt_approved_buddy';
    `);
  },

  async down() {
    // PostgreSQL doesn't support removing ENUM values easily
    // This would require recreating the entire ENUM type
    console.log(
      'Note: Removing ENUM values is not supported. The receipt_approved_buddy value will remain.',
    );
  },
};
