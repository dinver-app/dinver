'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove visibility column from Experiences table
    await queryInterface.removeColumn('Experiences', 'visibility');

    // Drop the ENUM type
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Experiences_visibility"'
    );
  },

  async down(queryInterface, Sequelize) {
    // Recreate ENUM type
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_Experiences_visibility" AS ENUM ('ALL', 'FOLLOWERS', 'BUDDIES')
    `);

    // Add visibility column back
    await queryInterface.addColumn('Experiences', 'visibility', {
      type: Sequelize.ENUM('ALL', 'FOLLOWERS', 'BUDDIES'),
      allowNull: false,
      defaultValue: 'ALL',
    });
  },
};
