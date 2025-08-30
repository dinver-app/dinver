'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop FK constraint if exists
    await queryInterface.sequelize.query(
      'ALTER TABLE "ReferralRewards" DROP CONSTRAINT IF EXISTS "ReferralRewards_couponId_fkey";',
    );
    // Drop column if exists
    await queryInterface.sequelize.query(
      'ALTER TABLE "ReferralRewards" DROP COLUMN IF EXISTS "couponId";',
    );
  },

  async down(queryInterface, Sequelize) {
    // Recreate couponId column (nullable) and FK to Coupons.id
    await queryInterface.addColumn('ReferralRewards', 'couponId', {
      type: Sequelize.UUID,
      allowNull: true,
    });

    await queryInterface.addConstraint('ReferralRewards', {
      fields: ['couponId'],
      type: 'foreign key',
      name: 'ReferralRewards_couponId_fkey',
      references: {
        table: 'Coupons',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },
};
