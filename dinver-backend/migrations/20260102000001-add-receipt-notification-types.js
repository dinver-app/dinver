'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Add receipt approval notification types to enum_Notifications_type
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Notifications_type"
      ADD VALUE IF NOT EXISTS 'receipt_approved';
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Notifications_type"
      ADD VALUE IF NOT EXISTS 'receipt_approved_shared';
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Notifications_type"
      ADD VALUE IF NOT EXISTS 'receipt_approved_shared_plural';
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Notifications_type"
      ADD VALUE IF NOT EXISTS 'receipt_approved_buddy';
    `);
  },

  async down() {
    // PostgreSQL doesn't support removing ENUM values easily
    // This would require recreating the entire ENUM type
    console.log(
      'Note: Removing ENUM values is not supported. The receipt notification types will remain.',
    );
  },
};
