'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove valueForMoney column
    await queryInterface.removeColumn('Reviews', 'valueForMoney');

    // Add visitDate column
    await queryInterface.addColumn('Reviews', 'visitDate', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    });
  },

  async down(queryInterface, Sequelize) {
    // Add back valueForMoney column
    await queryInterface.addColumn('Reviews', 'valueForMoney', {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 3.0,
      validate: {
        min: 1,
        max: 5,
      },
    });

    // Remove visitDate column
    await queryInterface.removeColumn('Reviews', 'visitDate');
  },
};
