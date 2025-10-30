'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Change pointsAtSelection from INTEGER to DECIMAL(10,2)
    await queryInterface.changeColumn(
      'LeaderboardCycleWinners',
      'pointsAtSelection',
      {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'How many points they had when selected',
      },
    );
  },

  async down(queryInterface, Sequelize) {
    // Revert pointsAtSelection back to INTEGER
    await queryInterface.changeColumn(
      'LeaderboardCycleWinners',
      'pointsAtSelection',
      {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'How many points they had when selected',
      },
    );
  },
};
