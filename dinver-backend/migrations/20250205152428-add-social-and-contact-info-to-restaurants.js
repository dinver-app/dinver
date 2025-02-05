'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Restaurants', 'website_url', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('Restaurants', 'fb_url', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('Restaurants', 'ig_url', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('Restaurants', 'phone', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('Restaurants', 'images', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Restaurants', 'website_url');
    await queryInterface.removeColumn('Restaurants', 'fb_url');
    await queryInterface.removeColumn('Restaurants', 'ig_url');
    await queryInterface.removeColumn('Restaurants', 'phone');
    await queryInterface.removeColumn('Restaurants', 'images');
  },
};
