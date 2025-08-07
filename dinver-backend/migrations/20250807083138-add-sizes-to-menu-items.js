'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add size-related columns to MenuItems table
    await queryInterface.addColumn('MenuItems', 'hasSizes', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('MenuItems', 'defaultSizeName', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('MenuItems', 'sizes', {
      type: Sequelize.JSONB,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove the added columns
    await queryInterface.removeColumn('MenuItems', 'hasSizes');
    await queryInterface.removeColumn('MenuItems', 'defaultSizeName');
    await queryInterface.removeColumn('MenuItems', 'sizes');
  },
};
