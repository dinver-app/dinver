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
    await queryInterface.removeColumn('Restaurants', 'venue_perks');

    await queryInterface.addColumn('Restaurants', 'food_types', {
      type: Sequelize.ARRAY(Sequelize.INTEGER),
      allowNull: true,
    });

    await queryInterface.addColumn('Restaurants', 'establishment_types', {
      type: Sequelize.ARRAY(Sequelize.INTEGER),
      allowNull: true,
    });

    await queryInterface.addColumn('Restaurants', 'establishment_perks', {
      type: Sequelize.ARRAY(Sequelize.INTEGER),
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
    await queryInterface.addColumn('Restaurants', 'venue_perks', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.removeColumn('Restaurants', 'food_types');
    await queryInterface.removeColumn('Restaurants', 'establishment_types');
    await queryInterface.removeColumn('Restaurants', 'establishment_perks');
  },
};
