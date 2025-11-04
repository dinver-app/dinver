'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add new columns for enhanced OCR system
    await queryInterface.addColumn('Receipts', 'merchantName', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Merchant/business name extracted from receipt',
    });

    await queryInterface.addColumn('Receipts', 'merchantAddress', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Merchant address extracted from receipt',
    });

    await queryInterface.addColumn('Receipts', 'declaredTotal', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Total amount declared by user (optional)',
    });

    await queryInterface.addColumn('Receipts', 'rawOcrText', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Raw OCR text from Google Vision',
    });

    await queryInterface.addColumn('Receipts', 'visionConfidence', {
      type: Sequelize.DECIMAL(3, 2),
      allowNull: true,
      comment: 'Google Vision overall confidence (0-1)',
    });

    await queryInterface.addColumn('Receipts', 'parserConfidence', {
      type: Sequelize.DECIMAL(3, 2),
      allowNull: true,
      comment: 'Parser confidence for extracted fields (0-1)',
    });

    await queryInterface.addColumn('Receipts', 'consistencyScore', {
      type: Sequelize.DECIMAL(3, 2),
      allowNull: true,
      comment: 'Consistency score between fields (0-1)',
    });

    await queryInterface.addColumn('Receipts', 'autoApproveScore', {
      type: Sequelize.DECIMAL(3, 2),
      allowNull: true,
      comment: 'Auto-approve score from decision engine (0-1)',
    });

    await queryInterface.addColumn('Receipts', 'fraudFlags', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of fraud indicators/warnings',
    });

    await queryInterface.addColumn('Receipts', 'perceptualHash', {
      type: Sequelize.STRING(64),
      allowNull: true,
      comment: 'Perceptual hash for duplicate image detection',
    });

    await queryInterface.addColumn('Receipts', 'gpsAccuracy', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'GPS accuracy in meters',
    });

    await queryInterface.addColumn('Receipts', 'deviceInfo', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Device information for fraud detection',
    });

    await queryInterface.addColumn('Receipts', 'ocrMethod', {
      type: Sequelize.ENUM('vision', 'gpt', 'vision+gpt', 'manual'),
      allowNull: true,
      defaultValue: 'vision',
      comment: 'OCR method used for extraction',
    });

    await queryInterface.addColumn('Receipts', 'fieldConfidences', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Confidence scores for individual fields',
    });

    // Add index for perceptual hash lookups
    await queryInterface.addIndex('Receipts', ['perceptualHash'], {
      name: 'receipts_perceptual_hash_idx',
    });

    // Add index for auto-approve score
    await queryInterface.addIndex('Receipts', ['autoApproveScore'], {
      name: 'receipts_auto_approve_score_idx',
    });

    // Add GIN index for fraud flags JSONB column
    await queryInterface.sequelize.query(`
      CREATE INDEX receipts_fraud_flags_idx ON "Receipts" USING GIN ("fraudFlags");
    `);
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex(
      'Receipts',
      'receipts_perceptual_hash_idx',
    );
    await queryInterface.removeIndex(
      'Receipts',
      'receipts_auto_approve_score_idx',
    );
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS receipts_fraud_flags_idx;
    `);

    // Remove columns
    await queryInterface.removeColumn('Receipts', 'merchantName');
    await queryInterface.removeColumn('Receipts', 'merchantAddress');
    await queryInterface.removeColumn('Receipts', 'declaredTotal');
    await queryInterface.removeColumn('Receipts', 'rawOcrText');
    await queryInterface.removeColumn('Receipts', 'visionConfidence');
    await queryInterface.removeColumn('Receipts', 'parserConfidence');
    await queryInterface.removeColumn('Receipts', 'consistencyScore');
    await queryInterface.removeColumn('Receipts', 'autoApproveScore');
    await queryInterface.removeColumn('Receipts', 'fraudFlags');
    await queryInterface.removeColumn('Receipts', 'perceptualHash');
    await queryInterface.removeColumn('Receipts', 'gpsAccuracy');
    await queryInterface.removeColumn('Receipts', 'deviceInfo');
    await queryInterface.removeColumn('Receipts', 'ocrMethod');
    await queryInterface.removeColumn('Receipts', 'fieldConfidences');
  },
};
