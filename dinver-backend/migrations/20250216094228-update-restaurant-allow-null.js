'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Restaurants', 'latitude', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
    await queryInterface.changeColumn('Restaurants', 'longitude', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
    await queryInterface.changeColumn('Restaurants', 'place_id', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    // ... repeat for all other fields except 'name' and 'address'
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Restaurants', 'latitude', {
      type: Sequelize.FLOAT,
      allowNull: false,
    });
    await queryInterface.changeColumn('Restaurants', 'longitude', {
      type: Sequelize.FLOAT,
      allowNull: false,
    });
    await queryInterface.changeColumn('Restaurants', 'place_id', {
      type: Sequelize.STRING,
      allowNull: false,
    });
    // ... repeat for all other fields except 'name' and 'address'
  },
};
