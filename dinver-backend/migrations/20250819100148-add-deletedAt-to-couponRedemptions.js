'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add deletedAt column to CouponRedemptions table
    await queryInterface.addColumn('CouponRedemptions', 'deletedAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Soft delete timestamp',
    });

    // Add index for deletedAt column
    await queryInterface.addIndex('CouponRedemptions', ['deletedAt']);
  },

  async down(queryInterface, Sequelize) {
    // Remove index first
    await queryInterface.removeIndex('CouponRedemptions', ['deletedAt']);

    // Remove deletedAt column
    await queryInterface.removeColumn('CouponRedemptions', 'deletedAt');
  },
};
