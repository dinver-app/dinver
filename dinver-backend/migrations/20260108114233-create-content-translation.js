'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ContentTranslations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      contentType: {
        type: Sequelize.ENUM('experience', 'restaurant_update'),
        allowNull: false,
      },
      contentId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      sourceLanguage: {
        type: Sequelize.STRING(5),
        allowNull: false,
      },
      targetLanguage: {
        type: Sequelize.STRING(5),
        allowNull: false,
      },
      originalText: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      translatedText: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // Unique constraint: jedan prijevod per content + target language
    await queryInterface.addIndex(
      'ContentTranslations',
      ['contentType', 'contentId', 'targetLanguage'],
      {
        unique: true,
        name: 'unique_content_translation',
      }
    );

    // Index za brzo dohvacanje
    await queryInterface.addIndex(
      'ContentTranslations',
      ['contentType', 'contentId'],
      {
        name: 'content_translations_content_idx',
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ContentTranslations');
  },
};
