'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.removeColumn('Restaurants', 'venue_perk');

    await queryInterface.addColumn('Restaurants', 'venue_perks', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.addColumn('Restaurants', 'venue_perk', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.removeColumn('Restaurants', 'venue_perks');
  },
};
