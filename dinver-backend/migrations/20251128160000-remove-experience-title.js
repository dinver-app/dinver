'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove the 'title' column from Experiences table
    // This column is no longer used - experiences don't have titles
    await queryInterface.removeColumn('Experiences', 'title');
  },

  async down(queryInterface, Sequelize) {
    // Re-add the 'title' column if needed to rollback
    await queryInterface.addColumn('Experiences', 'title', {
      type: Sequelize.STRING(255),
      allowNull: true, // Make it nullable for rollback
    });
  },
};
