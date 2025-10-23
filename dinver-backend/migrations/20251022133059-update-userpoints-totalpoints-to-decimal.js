'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Change totalPoints column from INTEGER to DECIMAL(10,2)
    await queryInterface.changeColumn('UserPoints', 'totalPoints', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert totalPoints column back to INTEGER
    await queryInterface.changeColumn('UserPoints', 'totalPoints', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },
};
