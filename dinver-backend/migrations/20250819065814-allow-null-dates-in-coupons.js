'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Allow null values for startsAt and expiresAt fields
    await queryInterface.changeColumn('Coupons', 'startsAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment:
        'When the coupon becomes available (nullable if using totalLimit)',
    });

    await queryInterface.changeColumn('Coupons', 'expiresAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'When the coupon expires (nullable if using totalLimit)',
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert back to not null
    await queryInterface.changeColumn('Coupons', 'startsAt', {
      type: Sequelize.DATE,
      allowNull: false,
      comment: 'When the coupon becomes available',
    });

    await queryInterface.changeColumn('Coupons', 'expiresAt', {
      type: Sequelize.DATE,
      allowNull: false,
      comment: 'When the coupon expires',
    });
  },
};
