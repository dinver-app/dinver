'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop NOT NULL constraint from createdBy column
    await queryInterface.changeColumn('LeaderboardCycles', 'createdBy', {
      type: Sequelize.UUID,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert to NOT NULL (will fail if there are null values)
    await queryInterface.changeColumn('LeaderboardCycles', 'createdBy', {
      type: Sequelize.UUID,
      allowNull: false,
    });
  },
};
