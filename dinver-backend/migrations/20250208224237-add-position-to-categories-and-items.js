'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('MenuCategories', 'position', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('MenuItems', 'position', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('MenuCategories', 'position');
    await queryInterface.removeColumn('MenuItems', 'position');
  },
};
