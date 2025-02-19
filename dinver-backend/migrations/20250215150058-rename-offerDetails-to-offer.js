'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn('ClaimLogs', 'offerDetails', 'offer');
    await queryInterface.changeColumn('ClaimLogs', 'offer', {
      type: Sequelize.ENUM('basic', 'premium', 'enterprise'),
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('ClaimLogs', 'offer', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.renameColumn('ClaimLogs', 'offer', 'offerDetails');
  },
};
