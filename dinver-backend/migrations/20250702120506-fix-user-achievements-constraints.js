'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop all existing constraints on UserAchievements table
    await queryInterface.sequelize.query(`
      DO $$ 
      DECLARE 
        r RECORD;
      BEGIN
        FOR r IN (
          SELECT con.conname
          FROM pg_catalog.pg_constraint con
          INNER JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
          INNER JOIN pg_catalog.pg_namespace nsp ON nsp.oid = rel.relnamespace
          WHERE rel.relname = 'UserAchievements'
          AND con.contype = 'u'  -- 'u' is for unique constraints
        )
        LOOP
          EXECUTE 'ALTER TABLE "UserAchievements" DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
        END LOOP;
      END $$;
    `);

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

    // Add back the original constraint
    await queryInterface.addConstraint('UserAchievements', {
      fields: ['userId', 'achievementId'],
      type: 'unique',
      name: 'UserAchievements_userId_achievementId_key',
    });
  },
};
