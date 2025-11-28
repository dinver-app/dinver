'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add 'non-binary' to the gender ENUM
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Users_gender" ADD VALUE IF NOT EXISTS 'non-binary';
    `);
  },

  async down(queryInterface, Sequelize) {
    // Note: PostgreSQL doesn't support removing values from ENUMs directly
    // To fully revert, you would need to:
    // 1. Create a new ENUM without 'non-binary'
    // 2. Update all 'non-binary' values to something else (e.g., 'other')
    // 3. Alter the column to use the new ENUM
    // 4. Drop the old ENUM
    // This is left as a no-op for safety
    console.log('Warning: Removing ENUM values is not supported in PostgreSQL. Manual intervention required if needed.');
  },
};
