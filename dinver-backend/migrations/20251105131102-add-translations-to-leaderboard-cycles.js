'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Step 1: Add new translation columns as nullable
    await queryInterface.addColumn('LeaderboardCycles', 'nameEn', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Cycle name in English',
    });

    await queryInterface.addColumn('LeaderboardCycles', 'nameHr', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Cycle name in Croatian',
    });

    await queryInterface.addColumn('LeaderboardCycles', 'descriptionEn', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Cycle description in English',
    });

    await queryInterface.addColumn('LeaderboardCycles', 'descriptionHr', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Cycle description in Croatian',
    });

    // Step 2: Migrate existing data (assume existing data is Croatian)
    await queryInterface.sequelize.query(`
      UPDATE "LeaderboardCycles"
      SET 
        "nameHr" = "name",
        "descriptionHr" = "description"
      WHERE "nameHr" IS NULL
    `);

    // Step 3: Copy nameHr to nameEn as fallback (can be updated later)
    await queryInterface.sequelize.query(`
      UPDATE "LeaderboardCycles"
      SET "nameEn" = "nameHr"
      WHERE "nameEn" IS NULL AND "nameHr" IS NOT NULL
    `);

    // Step 4: Make nameEn and nameHr NOT NULL
    await queryInterface.changeColumn('LeaderboardCycles', 'nameEn', {
      type: Sequelize.STRING,
      allowNull: false,
      comment: 'Cycle name in English',
    });

    await queryInterface.changeColumn('LeaderboardCycles', 'nameHr', {
      type: Sequelize.STRING,
      allowNull: false,
      comment: 'Cycle name in Croatian',
    });

    // Step 5: Drop old columns
    await queryInterface.removeColumn('LeaderboardCycles', 'name');
    await queryInterface.removeColumn('LeaderboardCycles', 'description');
  },

  async down(queryInterface, Sequelize) {
    // Step 1: Add back old columns
    await queryInterface.addColumn('LeaderboardCycles', 'name', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Cycle name/title',
    });

    await queryInterface.addColumn('LeaderboardCycles', 'description', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Rich text content with rules and prizes',
    });

    // Step 2: Migrate data back (use nameHr as primary)
    await queryInterface.sequelize.query(`
      UPDATE "LeaderboardCycles"
      SET 
        "name" = "nameHr",
        "description" = "descriptionHr"
      WHERE "name" IS NULL
    `);

    // Step 3: Make name NOT NULL
    await queryInterface.changeColumn('LeaderboardCycles', 'name', {
      type: Sequelize.STRING,
      allowNull: false,
      comment: 'Cycle name/title',
    });

    // Step 4: Remove translation columns
    await queryInterface.removeColumn('LeaderboardCycles', 'nameEn');
    await queryInterface.removeColumn('LeaderboardCycles', 'nameHr');
    await queryInterface.removeColumn('LeaderboardCycles', 'descriptionEn');
    await queryInterface.removeColumn('LeaderboardCycles', 'descriptionHr');
  },
};
