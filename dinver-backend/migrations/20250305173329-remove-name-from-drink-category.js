'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('DrinkCategories', 'name');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('DrinkCategories', 'name', {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },
};
