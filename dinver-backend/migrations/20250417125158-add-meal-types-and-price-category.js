'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Restaurants', 'meal_types', {
      type: Sequelize.ARRAY(Sequelize.INTEGER),
      allowNull: true,
    });

    await queryInterface.addColumn('Restaurants', 'price_category_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'PriceCategories',
        key: 'id',
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Restaurants', 'meal_types');
    await queryInterface.removeColumn('Restaurants', 'price_category_id');
  },
};
