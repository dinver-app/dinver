'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Reviews', 'photo_reference');
    await queryInterface.addColumn('Reviews', 'images', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('Reviews', 'photo_reference', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.removeColumn('Reviews', 'images');
  },
};
