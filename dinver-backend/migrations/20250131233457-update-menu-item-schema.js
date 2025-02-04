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
    await queryInterface.changeColumn('MenuItems', 'categoryId', {
      type: Sequelize.UUID,
      allowNull: true,
    });

    await queryInterface.renameColumn(
      'MenuCategories',
      'restaurant_id',
      'restaurantId',
    );
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.changeColumn('MenuItems', 'category_id', {
      type: Sequelize.UUID,
      allowNull: false,
    });

    await queryInterface.renameColumn(
      'MenuCategories',
      'restaurantId',
      'restaurant_id',
    );
  },
};
