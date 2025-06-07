'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Restaurants', 'foodQuality', {
      type: Sequelize.DECIMAL,
      allowNull: true,
      defaultValue: 0,
    });

    await queryInterface.addColumn('Restaurants', 'service', {
      type: Sequelize.DECIMAL,
      allowNull: true,
      defaultValue: 0,
    });

    await queryInterface.addColumn('Restaurants', 'atmosphere', {
      type: Sequelize.DECIMAL,
      allowNull: true,
      defaultValue: 0,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Restaurants', 'foodQuality');
    await queryInterface.removeColumn('Restaurants', 'service');
    await queryInterface.removeColumn('Restaurants', 'atmosphere');
  },
};
