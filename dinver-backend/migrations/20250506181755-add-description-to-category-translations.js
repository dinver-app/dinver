'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add description to MenuCategoryTranslation table
    await queryInterface.addColumn('MenuCategoryTranslations', 'description', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    // Add description to DrinkCategoryTranslation table
    await queryInterface.addColumn('DrinkCategoryTranslations', 'description', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove description from MenuCategoryTranslation table
    await queryInterface.removeColumn(
      'MenuCategoryTranslations',
      'description',
    );

    // Remove description from DrinkCategoryTranslation table
    await queryInterface.removeColumn(
      'DrinkCategoryTranslations',
      'description',
    );
  },
};
