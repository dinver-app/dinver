'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('reviews', 'food_quality', {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 3,
      validate: {
        min: 1,
        max: 5,
      },
    });

    await queryInterface.addColumn('reviews', 'service', {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 3,
      validate: {
        min: 1,
        max: 5,
      },
    });

    await queryInterface.addColumn('reviews', 'atmosphere', {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 3,
      validate: {
        min: 1,
        max: 5,
      },
    });

    await queryInterface.addColumn('reviews', 'value_for_money', {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 3,
      validate: {
        min: 1,
        max: 5,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('reviews', 'food_quality');
    await queryInterface.removeColumn('reviews', 'service');
    await queryInterface.removeColumn('reviews', 'atmosphere');
    await queryInterface.removeColumn('reviews', 'value_for_money');
  },
};
