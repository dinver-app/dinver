'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add new ENUM values for points system overhaul
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_UserPointsHistory_actionType" ADD VALUE 'review_elite';
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_UserPointsHistory_actionType" ADD VALUE 'referral_verification_referrer';
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_UserPointsHistory_actionType" ADD VALUE 'referral_verification_referred';
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_UserPointsHistory_actionType" ADD VALUE 'referral_first_receipt_referrer';
    `);
  },

  async down(queryInterface, Sequelize) {
    // Note: PostgreSQL doesn't allow removing ENUM values
    // The old values will remain but are deprecated:
    // - review_long, review_with_photo, visit_qr, reservation_visit
    // - achievement_unlocked, points_spent_coupon
    // - referral_registration_referrer, referral_registration_referred
    // - referral_visit_referrer
    console.log(
      'Cannot remove ENUM values in PostgreSQL - old values are deprecated but remain in database',
    );
  },
};
