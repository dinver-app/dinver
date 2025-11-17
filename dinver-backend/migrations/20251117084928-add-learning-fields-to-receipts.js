'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add learning fields to Receipts table for OCR training
    await queryInterface.addColumn('Receipts', 'predictedData', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'AI predicted fields (what Claude extracted) - for training and comparison',
    });

    await queryInterface.addColumn('Receipts', 'correctedData', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Human corrected fields (what sysadmin approved) - ground truth for training',
    });

    await queryInterface.addColumn('Receipts', 'correctionsMade', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Number of fields that were corrected by sysadmin',
    });

    await queryInterface.addColumn('Receipts', 'accuracy', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Percentage of fields that were correct (0-100)',
    });

    await queryInterface.addColumn('Receipts', 'usedForTraining', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this receipt was used for prompt improvement',
    });

    await queryInterface.addColumn('Receipts', 'modelVersion', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Claude model version used (e.g., "claude-3-5-sonnet-20250122")',
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove learning fields
    await queryInterface.removeColumn('Receipts', 'predictedData');
    await queryInterface.removeColumn('Receipts', 'correctedData');
    await queryInterface.removeColumn('Receipts', 'correctionsMade');
    await queryInterface.removeColumn('Receipts', 'accuracy');
    await queryInterface.removeColumn('Receipts', 'usedForTraining');
    await queryInterface.removeColumn('Receipts', 'modelVersion');
  }
};
