'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'username');
    await queryInterface.addColumn('Users', 'firstName', {
      type: Sequelize.STRING,
    });
    await queryInterface.addColumn('Users', 'lastName', {
      type: Sequelize.STRING,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'username', {
      type: Sequelize.STRING,
    });
    await queryInterface.removeColumn('Users', 'firstName');
    await queryInterface.removeColumn('Users', 'lastName');
  },
};
