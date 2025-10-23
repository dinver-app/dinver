'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add 'receipt_upload' to the actionType ENUM
    await queryInterface.changeColumn('UserPointsHistory', 'actionType', {
      type: Sequelize.ENUM(
        'review_add',
        'review_long',
        'review_with_photo',
        'visit_qr',
        'reservation_visit',
        'achievement_unlocked',
        'referral_registration_referrer',
        'referral_registration_referred',
        'referral_visit_referrer',
        'points_spent_coupon',
        'receipt_upload',
      ),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove 'receipt_upload' from the actionType ENUM
    await queryInterface.changeColumn('UserPointsHistory', 'actionType', {
      type: Sequelize.ENUM(
        'review_add',
        'review_long',
        'review_with_photo',
        'visit_qr',
        'reservation_visit',
        'achievement_unlocked',
        'referral_registration_referrer',
        'referral_registration_referred',
        'referral_visit_referrer',
        'points_spent_coupon',
      ),
      allowNull: false,
    });
  },
};
