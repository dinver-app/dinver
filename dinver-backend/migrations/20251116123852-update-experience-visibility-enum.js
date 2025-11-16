'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Step 1: Remove default value first
    await queryInterface.sequelize.query(`
      ALTER TABLE "Experiences"
      ALTER COLUMN visibility DROP DEFAULT
    `);

    // Step 2: Change column to VARCHAR temporarily
    await queryInterface.sequelize.query(`
      ALTER TABLE "Experiences"
      ALTER COLUMN visibility TYPE VARCHAR(20) USING visibility::VARCHAR
    `);

    // Step 3: Update existing data
    // PUBLIC -> ALL
    // PRIVATE -> BUDDIES
    await queryInterface.sequelize.query(`
      UPDATE "Experiences"
      SET visibility =
        CASE
          WHEN visibility = 'PUBLIC' THEN 'ALL'
          WHEN visibility = 'PRIVATE' THEN 'BUDDIES'
          ELSE visibility
        END
    `);

    // Step 4: Drop old ENUM type
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Experiences_visibility"',
    );

    // Step 5: Create new ENUM type
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_Experiences_visibility" AS ENUM ('ALL', 'FOLLOWERS', 'BUDDIES')
    `);

    // Step 6: Change column back to ENUM with new values using USING clause
    await queryInterface.sequelize.query(`
      ALTER TABLE "Experiences"
      ALTER COLUMN visibility TYPE "enum_Experiences_visibility" USING visibility::"enum_Experiences_visibility"
    `);

    // Step 7: Set default value
    await queryInterface.sequelize.query(`
      ALTER TABLE "Experiences"
      ALTER COLUMN visibility SET DEFAULT 'ALL'::"enum_Experiences_visibility"
    `);

    // Step 8: Set NOT NULL constraint
    await queryInterface.sequelize.query(`
      ALTER TABLE "Experiences"
      ALTER COLUMN visibility SET NOT NULL
    `);
  },

  async down(queryInterface, Sequelize) {
    // Step 1: Change column to VARCHAR temporarily
    await queryInterface.changeColumn('Experiences', 'visibility', {
      type: Sequelize.STRING,
      allowNull: false,
    });

    // Step 2: Revert data changes
    // ALL -> PUBLIC
    // FOLLOWERS -> PUBLIC (as it's closest)
    // BUDDIES -> PRIVATE
    await queryInterface.sequelize.query(`
      UPDATE "Experiences"
      SET visibility =
        CASE
          WHEN visibility = 'ALL' THEN 'PUBLIC'
          WHEN visibility = 'FOLLOWERS' THEN 'PUBLIC'
          WHEN visibility = 'BUDDIES' THEN 'PRIVATE'
          ELSE visibility
        END
    `);

    // Step 3: Drop new ENUM type
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Experiences_visibility"',
    );

    // Step 4: Create old ENUM type
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_Experiences_visibility" AS ENUM ('PUBLIC', 'PRIVATE')
    `);

    // Step 5: Change column back to old ENUM
    await queryInterface.changeColumn('Experiences', 'visibility', {
      type: Sequelize.ENUM('PUBLIC', 'PRIVATE'),
      allowNull: false,
      defaultValue: 'PUBLIC',
    });
  },
};
