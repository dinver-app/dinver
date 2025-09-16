'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn('AiThreads', 'deviceId');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('AiThreads', 'deviceId', {
      type: Sequelize.STRING(64),
      allowNull: false,
    });
  },
};
