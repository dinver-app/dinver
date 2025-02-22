'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Restaurants', 'customWorkingDays');
    await queryInterface.addColumn('Restaurants', 'customWorkingDays', {
      type: Sequelize.JSONB,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Restaurants', 'customWorkingDays');
    await queryInterface.addColumn('Restaurants', 'customWorkingDays', {
      type: Sequelize.ARRAY(Sequelize.JSONB),
      allowNull: true,
    });
  },
};
