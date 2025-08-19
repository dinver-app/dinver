'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create ENUM type for user coupon status (only if it doesn't exist)
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_UserCoupons_status" AS ENUM ('CLAIMED', 'REDEEMED', 'EXPIRED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create UserCoupons table
    await queryInterface.createTable('UserCoupons', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      couponId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Coupons', key: 'id' },
        comment: 'Reference to the coupon',
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'User who claimed the coupon',
      },
      claimedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'When the coupon was claimed',
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'When the user coupon expires (1 year from claimedAt)',
      },
      status: {
        type: Sequelize.ENUM('CLAIMED', 'REDEEMED', 'EXPIRED', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'CLAIMED',
        comment: 'Current status of the user coupon',
      },
      qrTokenHash: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Hash for QR code validation',
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
    await queryInterface.addIndex('UserCoupons', ['userId', 'status']);
    await queryInterface.addIndex('UserCoupons', ['couponId']);
    await queryInterface.addIndex('UserCoupons', ['qrTokenHash']);
  },

  async down(queryInterface, Sequelize) {
    // Drop the table
    await queryInterface.dropTable('UserCoupons');

    // Drop ENUM type
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_UserCoupons_status";',
    );
  },
};
