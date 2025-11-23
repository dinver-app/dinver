'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // BREAKING CHANGE: Delete all existing Visits
    // This is necessary to allow restaurantId to be nullable
    // Visits will be recreated when receipts are approved
    console.log('[Migration] Deleting all existing Visits...');
    await queryInterface.bulkDelete('Visits', null, {});
    console.log('[Migration] All Visits deleted');

    // Delete all existing Receipts that have a visitId
    // (orphaned receipts will cause foreign key issues)
    console.log('[Migration] Cleaning up Receipts with visitId...');
    await queryInterface.sequelize.query(
      'UPDATE "Receipts" SET "visitId" = NULL WHERE "visitId" IS NOT NULL;'
    );
    console.log('[Migration] Receipts cleaned up');

    // Now we can safely make restaurantId nullable
    console.log('[Migration] Making restaurantId nullable...');
    await queryInterface.sequelize.query(
      'ALTER TABLE "Visits" ALTER COLUMN "restaurantId" DROP NOT NULL;'
    );
    console.log('[Migration] restaurantId is now nullable');
  },

  async down(queryInterface, Sequelize) {
    // Revert: Make restaurantId NOT NULL again
    // This will FAIL if there are any visits with NULL restaurantId
    console.log('[Migration Rollback] Making restaurantId NOT NULL...');

    // First delete any visits with NULL restaurantId
    await queryInterface.sequelize.query(
      'DELETE FROM "Visits" WHERE "restaurantId" IS NULL;'
    );

    // Then restore NOT NULL constraint
    await queryInterface.sequelize.query(
      'ALTER TABLE "Visits" ALTER COLUMN "restaurantId" SET NOT NULL;'
    );

    console.log('[Migration Rollback] restaurantId is now NOT NULL again');
  },
};
