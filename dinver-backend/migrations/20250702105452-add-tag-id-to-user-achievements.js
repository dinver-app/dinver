'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('UserAchievements', 'tagId', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // Dodaj indeks za brže pretraživanje
    await queryInterface.addIndex('UserAchievements', {
      fields: ['userId', 'achievementId', 'tagId'],
      name: 'user_achievement_tag_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      'UserAchievements',
      'user_achievement_tag_idx',
    );
    await queryInterface.removeColumn('UserAchievements', 'tagId');
  },
};
