'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First, update any existing data to use lowercase
    await queryInterface.sequelize.query(`
      UPDATE "PushTokens" 
      SET platform = LOWER(platform) 
      WHERE platform IN ('iOS', 'Android', 'Web')
    `);

    // Drop the old enum type
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_PushTokens_platform" CASCADE
    `);

    // Add the new column with updated enum
    await queryInterface.changeColumn('PushTokens', 'platform', {
      type: Sequelize.ENUM('ios', 'android', 'windows', 'macos', 'web'),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert back to original enum
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_PushTokens_platform" CASCADE
    `);

    await queryInterface.changeColumn('PushTokens', 'platform', {
      type: Sequelize.ENUM('iOS', 'Android', 'Web'),
      allowNull: false,
    });
  },
};
