'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('RestaurantTranslations', 'longDescription', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Detailed restaurant description (500-1000 chars) for AI context and partner descriptions',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('RestaurantTranslations', 'longDescription');
  }
};
