'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove firstName column
    await queryInterface.removeColumn('Users', 'firstName');

    // Remove lastName column
    await queryInterface.removeColumn('Users', 'lastName');

    // Make name column required (if it's nullable)
    await queryInterface.changeColumn('Users', 'name', {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    // Re-add firstName column
    await queryInterface.addColumn('Users', 'firstName', {
      type: Sequelize.STRING,
      allowNull: true, // Allow null for rollback
    });

    // Re-add lastName column
    await queryInterface.addColumn('Users', 'lastName', {
      type: Sequelize.STRING,
      allowNull: true, // Allow null for rollback
    });

    // Make name column nullable again
    await queryInterface.changeColumn('Users', 'name', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  }
};
