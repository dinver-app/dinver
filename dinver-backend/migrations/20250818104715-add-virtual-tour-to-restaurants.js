'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Restaurants', 'virtualTourUrl', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'URL for virtual tour iframe (e.g., Kuula.co embed URL)',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Restaurants', 'virtualTourUrl');
  },
};
