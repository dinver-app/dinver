'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add visitId column to Receipts table
    await queryInterface.addColumn('Receipts', 'visitId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Visits',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Link to Visit (for new visit-based receipts)',
    });

    // Add index for better performance when querying by visitId
    await queryInterface.addIndex('Receipts', ['visitId'], {
      name: 'receipts_visit_id_idx',
    });

    // Add thumbnailUrl, mediumUrl, fullscreenUrl for image variants
    await queryInterface.addColumn('Receipts', 'thumbnailUrl', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'S3 key for thumbnail variant (400x400)',
    });

    await queryInterface.addColumn('Receipts', 'mediumUrl', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'S3 key for medium variant (1200px)',
    });

    await queryInterface.addColumn('Receipts', 'fullscreenUrl', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'S3 key for fullscreen variant (2400px)',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove image variant columns
    await queryInterface.removeColumn('Receipts', 'fullscreenUrl');
    await queryInterface.removeColumn('Receipts', 'mediumUrl');
    await queryInterface.removeColumn('Receipts', 'thumbnailUrl');

    // Remove index
    await queryInterface.removeIndex('Receipts', 'receipts_visit_id_idx');

    // Remove visitId column
    await queryInterface.removeColumn('Receipts', 'visitId');
  },
};
