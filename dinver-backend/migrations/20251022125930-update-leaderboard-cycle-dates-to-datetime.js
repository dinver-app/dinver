'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Update startDate column from DATEONLY to DATE
    await queryInterface.changeColumn('LeaderboardCycles', 'startDate', {
      type: Sequelize.DATE,
      allowNull: false,
      comment: 'Cycle start date and time',
    });

    // Update endDate column from DATEONLY to DATE
    await queryInterface.changeColumn('LeaderboardCycles', 'endDate', {
      type: Sequelize.DATE,
      allowNull: false,
      comment: 'Cycle end date and time',
    });

    // Update existing records to have time component
    // Set startDate to 00:00:00 and endDate to 23:59:59
    await queryInterface.sequelize.query(`
      UPDATE "LeaderboardCycles" 
      SET 
        "startDate" = "startDate"::timestamp + '00:00:00'::time,
        "endDate" = "endDate"::timestamp + '23:59:59'::time
      WHERE "startDate"::text = "startDate"::date::text
    `);
  },

  async down(queryInterface, Sequelize) {
    // Revert startDate column back to DATEONLY
    await queryInterface.changeColumn('LeaderboardCycles', 'startDate', {
      type: Sequelize.DATEONLY,
      allowNull: false,
      comment: 'Cycle start date',
    });

    // Revert endDate column back to DATEONLY
    await queryInterface.changeColumn('LeaderboardCycles', 'endDate', {
      type: Sequelize.DATEONLY,
      allowNull: false,
      comment: 'Cycle end date',
    });
  },
};
