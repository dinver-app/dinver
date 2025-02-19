'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Drop the existing columns
    await queryInterface.removeColumn('MenuItems', 'ingredients');
    await queryInterface.removeColumn('MenuItems', 'allergens');

    // Add the columns as arrays of integers
    await queryInterface.addColumn('MenuItems', 'ingredients', {
      type: Sequelize.ARRAY(Sequelize.INTEGER),
      allowNull: true,
    });

    await queryInterface.addColumn('MenuItems', 'allergens', {
      type: Sequelize.ARRAY(Sequelize.INTEGER),
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the integer array columns
    await queryInterface.removeColumn('MenuItems', 'ingredients');
    await queryInterface.removeColumn('MenuItems', 'allergens');

    // Re-add the columns as JSONB
    await queryInterface.addColumn('MenuItems', 'ingredients', {
      type: Sequelize.JSONB,
      allowNull: true,
    });

    await queryInterface.addColumn('MenuItems', 'allergens', {
      type: Sequelize.JSONB,
      allowNull: true,
    });
  },
};
