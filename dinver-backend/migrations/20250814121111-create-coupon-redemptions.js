'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
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
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      restaurantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      redeemedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      redeemedBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
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

    // Create indexes
    await queryInterface.addIndex('CouponRedemptions', ['restaurantId', 'redeemedAt']);
    await queryInterface.addIndex('CouponRedemptions', ['userCouponId']);
    await queryInterface.addIndex('CouponRedemptions', ['redeemedBy']);
    await queryInterface.addIndex('CouponRedemptions', ['redeemedAt']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('CouponRedemptions');
  }
};
