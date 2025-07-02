'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First, remove the enum constraint
    await queryInterface.sequelize.query(`
      ALTER TABLE "UserPointsHistory" 
      ALTER COLUMN "actionType" TYPE VARCHAR(255);
    `);

    // Then, drop the enum type
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_UserPointsHistory_actionType";
    `);

    // Create the enum type with all values including the new one
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_UserPointsHistory_actionType" AS ENUM (
        'review_add',
        'review_long',
        'review_with_photo',
        'reservation_created',
        'reservation_attended',
        'reservation_cancelled_by_user',
        'profile_verify',
        'first_favorite',
        'new_cuisine_type',
        'achievement_unlocked',
        'visit_qr'
      );
    `);

    // Finally, alter the column to use the new enum type
    await queryInterface.sequelize.query(`
      ALTER TABLE "UserPointsHistory" 
      ALTER COLUMN "actionType" TYPE "enum_UserPointsHistory_actionType" 
      USING ("actionType"::text::"enum_UserPointsHistory_actionType");
    `);
  },

  async down(queryInterface, Sequelize) {
    // First, remove the enum constraint
    await queryInterface.sequelize.query(`
      ALTER TABLE "UserPointsHistory" 
      ALTER COLUMN "actionType" TYPE VARCHAR(255);
    `);

    // Then, drop the enum type
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_UserPointsHistory_actionType";
    `);

    // Create the enum type without the new value
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_UserPointsHistory_actionType" AS ENUM (
        'review_add',
        'review_long',
        'review_with_photo',
        'reservation_created',
        'reservation_attended',
        'reservation_cancelled_by_user',
        'profile_verify',
        'first_favorite',
        'new_cuisine_type',
        'achievement_unlocked'
      );
    `);

    // Finally, alter the column to use the original enum type
    await queryInterface.sequelize.query(`
      ALTER TABLE "UserPointsHistory" 
      ALTER COLUMN "actionType" TYPE "enum_UserPointsHistory_actionType" 
      USING ("actionType"::text::"enum_UserPointsHistory_actionType");
    `);
  },
};
