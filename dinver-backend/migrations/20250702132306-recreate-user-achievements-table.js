'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop old table
    await queryInterface.dropTable('UserAchievements');

    // Create new table with updated structure
    await queryInterface.createTable('UserAchievements', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      achievementId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Achievements',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      unlockedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add unique constraint
    await queryInterface.addIndex(
      'UserAchievements',
      ['userId', 'achievementId'],
      {
        unique: true,
        name: 'user_achievement_unique_idx',
      },
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('UserAchievements');
  },
};
