'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Restaurants', 'wifiSsid', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('Restaurants', 'wifiPassword', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('Restaurants', 'showWifiCredentials', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Restaurants', 'wifiSsid');
    await queryInterface.removeColumn('Restaurants', 'wifiPassword');
    await queryInterface.removeColumn('Restaurants', 'showWifiCredentials');
  },
};
