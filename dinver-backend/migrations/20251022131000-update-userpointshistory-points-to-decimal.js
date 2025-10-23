'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Change points column from INTEGER to DECIMAL(10,2)
    await queryInterface.changeColumn('UserPointsHistory', 'points', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert points column back to INTEGER
    await queryInterface.changeColumn('UserPointsHistory', 'points', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  },
};
