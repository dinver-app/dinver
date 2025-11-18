'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Restaurants', 'longDescription');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('Restaurants', 'longDescription', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Detailed restaurant description (500-1000 chars) for AI context and partner descriptions',
    });
  }
};
