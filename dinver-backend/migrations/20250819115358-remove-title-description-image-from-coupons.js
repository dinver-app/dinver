'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove title, description, and imageUrl columns from Coupons table
    await queryInterface.removeColumn('Coupons', 'title');
    await queryInterface.removeColumn('Coupons', 'description');
    await queryInterface.removeColumn('Coupons', 'imageUrl');
  },

  async down(queryInterface, Sequelize) {
    // Add back the columns in case of rollback
    await queryInterface.addColumn('Coupons', 'title', {
      type: Sequelize.STRING,
      allowNull: false,
      comment: 'Coupon title',
    });
    
    await queryInterface.addColumn('Coupons', 'description', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Coupon description',
    });
    
    await queryInterface.addColumn('Coupons', 'imageUrl', {
      type: Sequelize.STRING,
      allowNull: false,
      comment: 'Coupon image URL',
    });
  },
};
