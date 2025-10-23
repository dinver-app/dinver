'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Restaurants', 'oib', {
      type: Sequelize.STRING(11),
      allowNull: true,
      unique: true,
    });

    // Add index for OIB field for faster lookups
    await queryInterface.addIndex('Restaurants', ['oib'], {
      name: 'restaurants_oib_index',
      unique: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('Restaurants', 'restaurants_oib_index');
    await queryInterface.removeColumn('Restaurants', 'oib');
  },
};
