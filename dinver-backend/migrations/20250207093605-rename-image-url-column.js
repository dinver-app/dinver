'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn('MenuItems', 'image_url', 'imageUrl');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameColumn('MenuItems', 'imageUrl', 'image_url');
  },
};
