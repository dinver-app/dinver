'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First drop the column
    await queryInterface.removeColumn('PostViews', 'timeOfDay');

    // Then recreate it with INTEGER type
    await queryInterface.addColumn('PostViews', 'timeOfDay', {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        max: 23,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    // First drop the INTEGER column
    await queryInterface.removeColumn('PostViews', 'timeOfDay');

    // Then recreate it with TIME type
    await queryInterface.addColumn('PostViews', 'timeOfDay', {
      type: Sequelize.TIME,
      allowNull: false,
    });
  },
};
