'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add originalUrl column to Receipts table
    await queryInterface.addColumn('Receipts', 'originalUrl', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'S3 key for original high-quality variant (3200px, 92% quality) - for OCR, admin review, legal',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove originalUrl column
    await queryInterface.removeColumn('Receipts', 'originalUrl');
  },
};
