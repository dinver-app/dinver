'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('VisitValidations', 'restaurantId', {
      type: Sequelize.UUID,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('VisitValidations', 'restaurantId', {
      type: Sequelize.UUID,
      allowNull: false,
    });
  },
};
