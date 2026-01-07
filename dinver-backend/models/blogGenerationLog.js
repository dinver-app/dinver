'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BlogGenerationLog extends Model {
    static associate(models) {
      BlogGenerationLog.belongsTo(models.BlogTopic, {
        foreignKey: 'blogTopicId',
        as: 'blogTopic',
      });
    }
  }

  BlogGenerationLog.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      blogTopicId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'BlogTopics',
          key: 'id',
        },
      },
      stage: {
        type: DataTypes.ENUM(
          'research',
          'outline',
          'draft_hr',
          'draft_en',
          'edit',
          'seo',
          'image',
          'linkedin_hr',
          'linkedin_en'
        ),
        allowNull: false,
      },
      agentName: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      inputData: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      outputData: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      promptTokens: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      completionTokens: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      totalTokens: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      durationMs: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      modelUsed: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('started', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'started',
      },
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'BlogGenerationLog',
      tableName: 'BlogGenerationLogs',
      timestamps: true,
      indexes: [
        { fields: ['blogTopicId', 'stage'] },
        { fields: ['status'] },
        { fields: ['createdAt'] },
      ],
    }
  );

  return BlogGenerationLog;
};
