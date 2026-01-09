'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ContentTranslation extends Model {
    static associate(models) {
      // No direct associations - contentId is polymorphic
      // (can reference Experience or RestaurantUpdate)
    }
  }

  ContentTranslation.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      contentType: {
        type: DataTypes.ENUM('experience', 'restaurant_update'),
        allowNull: false,
      },
      contentId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      sourceLanguage: {
        type: DataTypes.STRING(5),
        allowNull: false,
      },
      targetLanguage: {
        type: DataTypes.STRING(5),
        allowNull: false,
      },
      originalText: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      translatedText: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'ContentTranslation',
      tableName: 'ContentTranslations',
      indexes: [
        { fields: ['contentType', 'contentId'] },
        {
          fields: ['contentType', 'contentId', 'targetLanguage'],
          unique: true,
          name: 'unique_content_translation',
        },
      ],
    }
  );

  return ContentTranslation;
};
