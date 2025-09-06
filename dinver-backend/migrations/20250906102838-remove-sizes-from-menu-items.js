'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove sizes and defaultSizeId columns from MenuItems table
    await queryInterface.removeColumn('MenuItems', 'sizes');
    await queryInterface.removeColumn('MenuItems', 'defaultSizeId');
  },

  async down(queryInterface, Sequelize) {
    // Add back the removed columns
    await queryInterface.addColumn('MenuItems', 'sizes', {
      type: Sequelize.JSONB,
      allowNull: true,
    });
    await queryInterface.addColumn('MenuItems', 'defaultSizeId', {
      type: Sequelize.UUID,
      allowNull: true,
    });
  },
};
