'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Create ENUM type first
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_user_coupons_status" AS ENUM ('CLAIMED', 'REDEEMED', 'EXPIRED', 'CANCELLED');
    `);

    await queryInterface.createTable('UserCoupons', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      couponId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Coupons',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      claimedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'When this user coupon expires (1 year from claim)',
      },
      status: {
        type: Sequelize.ENUM('CLAIMED', 'REDEEMED', 'EXPIRED', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'CLAIMED',
      },
      qrTokenHash: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Hash for short-lived QR token',
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
    await queryInterface.addIndex('UserCoupons', ['userId', 'status']);
    await queryInterface.addIndex('UserCoupons', ['couponId']);
    await queryInterface.addIndex('UserCoupons', ['status']);
    await queryInterface.addIndex('UserCoupons', ['expiresAt']);
    
    // Create unique partial index for (userId, couponId) respecting perUserLimit
    // This will be handled in application logic
    await queryInterface.addIndex('UserCoupons', ['userId', 'couponId']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('UserCoupons');
    
    // Drop ENUM type
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_user_coupons_status";
    `);
  }
};
