'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Modify the actionType column to include the new enum value
    await queryInterface.changeColumn('UserPointsHistory', 'actionType', {
      type: Sequelize.ENUM(
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
        'visit_qr',
      ),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert back to original enum values
    await queryInterface.changeColumn('UserPointsHistory', 'actionType', {
      type: Sequelize.ENUM(
        'review_add',
        'review_with_photo',
        'reservation_created',
        'reservation_attended',
        'reservation_cancelled_by_user',
        'profile_verify',
        'first_favorite',
        'new_cuisine_type',
        'achievement_unlocked',
      ),
      allowNull: false,
    });
  },
};
