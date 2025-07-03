'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First remove the existing unique constraint if it exists
    try {
      await queryInterface.removeConstraint(
        'UserAchievements',
        'UserAchievements_userId_achievementId_key',
      );
    } catch (error) {
      console.log('No existing constraint to remove');
    }

    // Add new unique constraint that includes tagId
    await queryInterface.addConstraint('UserAchievements', {
      fields: ['userId', 'achievementId', 'tagId'],
      type: 'unique',
      name: 'user_achievement_tag_unique',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove the new constraint
    await queryInterface.removeConstraint(
      'UserAchievements',
      'user_achievement_tag_unique',
    );

    // Add back the old constraint
    await queryInterface.addConstraint('UserAchievements', {
      fields: ['userId', 'achievementId'],
      type: 'unique',
      name: 'UserAchievements_userId_achievementId_key',
    });
  },
};
