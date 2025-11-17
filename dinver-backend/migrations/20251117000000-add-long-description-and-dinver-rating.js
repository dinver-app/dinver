'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add longDescription for detailed restaurant description (for AI and sysadmin)
    await queryInterface.addColumn('Restaurants', 'longDescription', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Detailed restaurant description (500-1000 chars) for AI context and partner descriptions',
    });

    // Add Dinver custom rating (separate from Google rating)
    await queryInterface.addColumn('Restaurants', 'dinverRating', {
      type: Sequelize.DECIMAL(3, 2),
      allowNull: true,
      comment: 'Dinver custom rating (1.00-5.00) based on Experiences reviews system',
    });

    // Add Dinver reviews count (separate from Google userRatingsTotal)
    await queryInterface.addColumn('Restaurants', 'dinverReviewsCount', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Count of Dinver reviews from Experiences system',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Restaurants', 'longDescription');
    await queryInterface.removeColumn('Restaurants', 'dinverRating');
    await queryInterface.removeColumn('Restaurants', 'dinverReviewsCount');
  },
};
