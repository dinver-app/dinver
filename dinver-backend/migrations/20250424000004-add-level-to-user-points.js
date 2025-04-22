'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('UserPoints', 'level', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    });

    // Ažuriraj postojeće levele bazirano na bodovima
    await queryInterface.sequelize.query(`
      UPDATE "UserPoints"
      SET level = 
        CASE
          WHEN total_points >= 1000 THEN 5
          WHEN total_points >= 500 THEN 4
          WHEN total_points >= 250 THEN 3
          WHEN total_points >= 100 THEN 2
          ELSE 1
        END;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('UserPoints', 'level');
  },
};
