'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add temporary columns for string data
    await queryInterface.addColumn('LeaderboardCycles', 'startDateTemp', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('LeaderboardCycles', 'endDateTemp', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // Convert existing data to timezone-naive format in temp columns
    await queryInterface.sequelize.query(`
      UPDATE "LeaderboardCycles" 
      SET 
        "startDateTemp" = TO_CHAR("startDate" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI'),
        "endDateTemp" = TO_CHAR("endDate" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI')
    `);

    // Drop original columns
    await queryInterface.removeColumn('LeaderboardCycles', 'startDate');
    await queryInterface.removeColumn('LeaderboardCycles', 'endDate');

    // Rename temp columns to original names
    await queryInterface.renameColumn(
      'LeaderboardCycles',
      'startDateTemp',
      'startDate',
    );
    await queryInterface.renameColumn(
      'LeaderboardCycles',
      'endDateTemp',
      'endDate',
    );

    // Set columns as NOT NULL
    await queryInterface.changeColumn('LeaderboardCycles', 'startDate', {
      type: Sequelize.STRING,
      allowNull: false,
      comment: 'Cycle start date and time (timezone-naive)',
    });

    await queryInterface.changeColumn('LeaderboardCycles', 'endDate', {
      type: Sequelize.STRING,
      allowNull: false,
      comment: 'Cycle end date and time (timezone-naive)',
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert back to DATE columns
    await queryInterface.changeColumn('LeaderboardCycles', 'startDate', {
      type: Sequelize.DATE,
      allowNull: false,
      comment: 'Cycle start date and time',
    });

    await queryInterface.changeColumn('LeaderboardCycles', 'endDate', {
      type: Sequelize.DATE,
      allowNull: false,
      comment: 'Cycle end date and time',
    });

    // Convert string data back to proper DATE format
    await queryInterface.sequelize.query(`
      UPDATE "LeaderboardCycles" 
      SET 
        "startDate" = ("startDate" || ':00.000Z')::timestamp,
        "endDate" = ("endDate" || ':00.000Z')::timestamp
    `);
  },
};
