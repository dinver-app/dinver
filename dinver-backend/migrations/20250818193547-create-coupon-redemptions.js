'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create CouponRedemptions table
    await queryInterface.createTable('CouponRedemptions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userCouponId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'UserCoupons',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'User coupon that was redeemed',
      },
      restaurantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Restaurant where the coupon was redeemed',
      },
      redeemedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'When the coupon was redeemed',
      },
      redeemedBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Staff/admin who validated the redemption',
      },
      meta: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional metadata about the redemption',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Add indexes
    await queryInterface.addIndex('CouponRedemptions', [
      'restaurantId',
      'redeemedAt',
    ]);
    await queryInterface.addIndex('CouponRedemptions', ['userCouponId']);
    await queryInterface.addIndex('CouponRedemptions', ['redeemedBy']);
    await queryInterface.addIndex('CouponRedemptions', ['redeemedAt']);
  },

  async down(queryInterface, Sequelize) {
    // Drop the table
    await queryInterface.dropTable('CouponRedemptions');
  },
};
