'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameTable('reviews', 'Reviews');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameTable('Reviews', 'reviews');
  },
};
