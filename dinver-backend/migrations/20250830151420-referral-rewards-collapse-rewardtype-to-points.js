'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Collapse ReferralRewards.rewardType enum to only 'POINTS'
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_ReferralRewards_rewardType_new";',
    );
    await queryInterface.sequelize.query(
      'CREATE TYPE "enum_ReferralRewards_rewardType_new" AS ENUM (\'POINTS\');',
    );

    // Drop default first (if any)
    await queryInterface.sequelize.query(
      'ALTER TABLE "ReferralRewards" ALTER COLUMN "rewardType" DROP DEFAULT;',
    );

    // Cast existing values to new type (map COUPON/CASH to POINTS)
    await queryInterface.sequelize.query(
      'ALTER TABLE "ReferralRewards" ALTER COLUMN "rewardType" TYPE "enum_ReferralRewards_rewardType_new" USING CASE WHEN "rewardType" IN (\'COUPON\', \'CASH\') THEN \'POINTS\'::"enum_ReferralRewards_rewardType_new" ELSE "rewardType"::text::"enum_ReferralRewards_rewardType_new" END;',
    );

    // Set default to POINTS
    await queryInterface.sequelize.query(
      'ALTER TABLE "ReferralRewards" ALTER COLUMN "rewardType" SET DEFAULT \'POINTS\';',
    );

    // Replace old enum type
    await queryInterface.sequelize.query(
      'DROP TYPE "enum_ReferralRewards_rewardType";',
    );
    await queryInterface.sequelize.query(
      'ALTER TYPE "enum_ReferralRewards_rewardType_new" RENAME TO "enum_ReferralRewards_rewardType";',
    );
  },

  async down(queryInterface, Sequelize) {
    // Recreate original enum with POINTS, COUPON, CASH
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_ReferralRewards_rewardType_old";',
    );
    await queryInterface.sequelize.query(
      "CREATE TYPE \"enum_ReferralRewards_rewardType_old\" AS ENUM ('POINTS','COUPON','CASH');",
    );

    // Drop default first
    await queryInterface.sequelize.query(
      'ALTER TABLE "ReferralRewards" ALTER COLUMN "rewardType" DROP DEFAULT;',
    );

    // Cast back (non-POINTS map to POINTS as safe fallback)
    await queryInterface.sequelize.query(
      'ALTER TABLE "ReferralRewards" ALTER COLUMN "rewardType" TYPE "enum_ReferralRewards_rewardType_old" USING CASE WHEN "rewardType"::text = \'POINTS\' THEN \'POINTS\'::"enum_ReferralRewards_rewardType_old" ELSE \'POINTS\'::"enum_ReferralRewards_rewardType_old" END;',
    );

    // Optionally restore default (none here)

    await queryInterface.sequelize.query(
      'DROP TYPE "enum_ReferralRewards_rewardType";',
    );
    await queryInterface.sequelize.query(
      'ALTER TYPE "enum_ReferralRewards_rewardType_old" RENAME TO "enum_ReferralRewards_rewardType";',
    );
  },
};
