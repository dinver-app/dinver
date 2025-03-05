'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('DrinkItems', 'name');
    await queryInterface.removeColumn('DrinkItems', 'description');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('DrinkItems', 'name', {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn('DrinkItems', 'description', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};
