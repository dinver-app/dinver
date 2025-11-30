'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Remove old indexes that use cycleId from ExperienceLikes
    await queryInterface.removeIndex('ExperienceLikes', 'unique_like_per_cycle');
    await queryInterface.removeIndex('ExperienceLikes', 'experience_likes_cycle_id');

    // 2. Remove the V2 partial index if it exists (from previous migration)
    try {
      await queryInterface.removeIndex('ExperienceLikes', 'unique_like_v2');
    } catch (e) {
      // Index might not exist
    }

    // 3. Remove cycleId column from ExperienceLikes
    await queryInterface.removeColumn('ExperienceLikes', 'cycleId');

    // 4. Add simple unique index for one like per user per experience
    await queryInterface.addIndex('ExperienceLikes', ['experienceId', 'userId'], {
      name: 'unique_experience_like',
      unique: true,
    });

    // 5. Remove old indexes that use cycleId from ExperienceSaves
    try {
      await queryInterface.removeIndex('ExperienceSaves', 'save_per_cycle_index');
    } catch (e) {
      // Index might not exist
    }
    try {
      await queryInterface.removeIndex('ExperienceSaves', 'experience_saves_cycle_id');
    } catch (e) {
      // Index might not exist
    }

    // 6. Remove cycleId column from ExperienceSaves
    await queryInterface.removeColumn('ExperienceSaves', 'cycleId');
  },

  async down(queryInterface, Sequelize) {
    // Add back cycleId to ExperienceLikes
    await queryInterface.addColumn('ExperienceLikes', 'cycleId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'LeaderboardCycles',
        key: 'id',
      },
      onUpdate: 'CASCADE',
    });

    // Remove simple unique index
    await queryInterface.removeIndex('ExperienceLikes', 'unique_experience_like');

    // Add back original indexes
    await queryInterface.addIndex('ExperienceLikes', ['cycleId'], {
      name: 'experience_likes_cycle_id',
    });
    await queryInterface.addIndex(
      'ExperienceLikes',
      ['experienceId', 'userId', 'cycleId'],
      {
        unique: true,
        name: 'unique_like_per_cycle',
      },
    );

    // Add back cycleId to ExperienceSaves
    await queryInterface.addColumn('ExperienceSaves', 'cycleId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'LeaderboardCycles',
        key: 'id',
      },
      onUpdate: 'CASCADE',
    });

    // Add back indexes
    await queryInterface.addIndex('ExperienceSaves', ['cycleId'], {
      name: 'experience_saves_cycle_id',
    });
    await queryInterface.addIndex(
      'ExperienceSaves',
      ['experienceId', 'userId', 'cycleId'],
      {
        name: 'save_per_cycle_index',
      },
    );
  },
};
