'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Restaurants', 'venue_perk', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: true, // or false if it's required
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Restaurants', 'venue_perk');
  },
};
