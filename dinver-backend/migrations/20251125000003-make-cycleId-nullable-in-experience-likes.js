'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Make cycleId nullable for V2 (likes without leaderboard cycles)
    await queryInterface.changeColumn('ExperienceLikes', 'cycleId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'LeaderboardCycles',
        key: 'id',
      },
      comment: 'Optional - V2 likes do not use cycles',
    });

    // Add a new unique index for V2 likes (without cycleId)
    // This allows one like per user per experience (regardless of cycle)
    await queryInterface.addIndex('ExperienceLikes', ['experienceId', 'userId'], {
      name: 'unique_like_v2',
      unique: true,
      where: {
        cycleId: null,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove V2 index
    await queryInterface.removeIndex('ExperienceLikes', 'unique_like_v2');

    // Make cycleId required again
    await queryInterface.changeColumn('ExperienceLikes', 'cycleId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'LeaderboardCycles',
        key: 'id',
      },
      comment: 'Points are awarded per cycle to prevent duplicate points',
    });
  },
};
