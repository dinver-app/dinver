'use strict';
const crypto = require('crypto');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Delete all achievements with WORLD_CUISINE category
    await queryInterface.bulkDelete('Achievements', {
      category: 'WORLD_CUISINE',
    });

    // Delete related user achievements for WORLD_CUISINE achievements
    await queryInterface.sequelize.query(`
      DELETE FROM "UserAchievements"
      WHERE "achievementId" IN (
        SELECT id FROM "Achievements"
        WHERE category = 'WORLD_CUISINE'
      );
    `);

    // Add new RELIABLE_GUEST achievements
    await queryInterface.bulkInsert('Achievements', [
      {
        id: crypto.randomUUID(),
        category: 'RELIABLE_GUEST',
        level: 1,
        nameEn: 'Trusted Guest',
        nameHr: 'Pouzdani Gost',
        threshold: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: crypto.randomUUID(),
        category: 'RELIABLE_GUEST',
        level: 2,
        nameEn: 'Regular Guest',
        nameHr: 'Redoviti Gost',
        threshold: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: crypto.randomUUID(),
        category: 'RELIABLE_GUEST',
        level: 3,
        nameEn: 'VIP Guest',
        nameHr: 'VIP Gost',
        threshold: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: crypto.randomUUID(),
        category: 'RELIABLE_GUEST',
        level: 4,
        nameEn: 'Elite Guest',
        nameHr: 'Elitni Gost',
        threshold: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    // Delete all RELIABLE_GUEST achievements
    await queryInterface.bulkDelete('Achievements', {
      category: 'RELIABLE_GUEST',
    });

    // Delete related user achievements for RELIABLE_GUEST achievements
    await queryInterface.sequelize.query(`
      DELETE FROM "UserAchievements"
      WHERE "achievementId" IN (
        SELECT id FROM "Achievements"
        WHERE category = 'RELIABLE_GUEST'
      );
    `);

    // Restore WORLD_CUISINE achievements
    await queryInterface.bulkInsert('Achievements', [
      {
        id: crypto.randomUUID(),
        category: 'WORLD_CUISINE',
        level: 1,
        nameEn: 'Cuisine Explorer',
        nameHr: 'Istraživač Kuhinja',
        threshold: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: crypto.randomUUID(),
        category: 'WORLD_CUISINE',
        level: 2,
        nameEn: 'Cuisine Enthusiast',
        nameHr: 'Entuzijast Kuhinja',
        threshold: 6,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: crypto.randomUUID(),
        category: 'WORLD_CUISINE',
        level: 3,
        nameEn: 'Cuisine Connoisseur',
        nameHr: 'Poznavatelj Kuhinja',
        threshold: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: crypto.randomUUID(),
        category: 'WORLD_CUISINE',
        level: 4,
        nameEn: 'World Chef',
        nameHr: 'Svjetski Kuhar',
        threshold: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },
};
