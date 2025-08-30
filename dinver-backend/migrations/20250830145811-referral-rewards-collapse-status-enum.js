'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Collapse ReferralRewards.status enum to only 'CLAIMED'
    // 1) Create new enum type
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_ReferralRewards_status_new";',
    );
    await queryInterface.sequelize.query(
      'CREATE TYPE "enum_ReferralRewards_status_new" AS ENUM (\'CLAIMED\');',
    );

    // 2) Drop existing default to avoid casting error
    await queryInterface.sequelize.query(
      'ALTER TABLE "ReferralRewards" ALTER COLUMN "status" DROP DEFAULT;',
    );

    // 3) Alter column to use new enum, casting existing values
    await queryInterface.sequelize.query(
      'ALTER TABLE "ReferralRewards" ALTER COLUMN "status" TYPE "enum_ReferralRewards_status_new" USING CASE WHEN "status" IN (\'PENDING\',\'EXPIRED\') THEN \'CLAIMED\'::"enum_ReferralRewards_status_new" ELSE "status"::text::"enum_ReferralRewards_status_new" END;',
    );

    // 4) Set new default
    await queryInterface.sequelize.query(
      'ALTER TABLE "ReferralRewards" ALTER COLUMN "status" SET DEFAULT \'CLAIMED\';',
    );

    // 5) Drop old enum type and rename new one to original
    await queryInterface.sequelize.query(
      'DROP TYPE "enum_ReferralRewards_status";',
    );
    await queryInterface.sequelize.query(
      'ALTER TYPE "enum_ReferralRewards_status_new" RENAME TO "enum_ReferralRewards_status";',
    );
  },

  async down(queryInterface, Sequelize) {
    // Recreate original enum with PENDING, CLAIMED, EXPIRED
    await queryInterface.sequelize.query(
      "CREATE TYPE \"enum_ReferralRewards_status_old\" AS ENUM ('PENDING','CLAIMED','EXPIRED');",
    );

    // Drop default first
    await queryInterface.sequelize.query(
      'ALTER TABLE "ReferralRewards" ALTER COLUMN "status" DROP DEFAULT;',
    );

    await queryInterface.sequelize.query(
      'ALTER TABLE "ReferralRewards" ALTER COLUMN "status" TYPE "enum_ReferralRewards_status_old" USING CASE WHEN "status"::text = \'CLAIMED\' THEN \'CLAIMED\'::"enum_ReferralRewards_status_old" ELSE \'PENDING\'::"enum_ReferralRewards_status_old" END;',
    );

    // Restore old default
    await queryInterface.sequelize.query(
      'ALTER TABLE "ReferralRewards" ALTER COLUMN "status" SET DEFAULT \'PENDING\';',
    );

    await queryInterface.sequelize.query(
      'DROP TYPE "enum_ReferralRewards_status";',
    );
    await queryInterface.sequelize.query(
      'ALTER TYPE "enum_ReferralRewards_status_old" RENAME TO "enum_ReferralRewards_status";',
    );
  },
};
