'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ExperienceEngagement extends Model {
    static associate(models) {
      ExperienceEngagement.belongsTo(models.Experience, {
        foreignKey: 'experienceId',
        as: 'experience',
      });
    }

    // Helper method to calculate engagement score
    static calculateScore(engagement) {
      const now = new Date();
      const createdAt = new Date(engagement.createdAt);
      const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);

      // Weights for different engagement types
      const WEIGHT_LIKE = 1.0;
      const WEIGHT_SAVE = 2.0;
      const WEIGHT_VIEW = 0.1;
      const WEIGHT_SHARE = 3.0;
      const WEIGHT_COMPLETION = 0.5;

      // Time decay factor (content loses relevance over time)
      // Half-life of 48 hours
      const DECAY_HALF_LIFE = 48;
      const decayFactor = Math.pow(0.5, hoursSinceCreation / DECAY_HALF_LIFE);

      // Engagement score calculation
      const engagementScore =
        (engagement.likesCount * WEIGHT_LIKE +
          engagement.savesCount * WEIGHT_SAVE +
          engagement.viewsCount * WEIGHT_VIEW +
          engagement.sharesCount * WEIGHT_SHARE +
          engagement.avgCompletionRate * 100 * WEIGHT_COMPLETION) *
        decayFactor;

      return engagementScore;
    }
  }

  ExperienceEngagement.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      experienceId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'Experiences',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      // Engagement counts
      likesCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      savesCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      viewsCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      uniqueViewsCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Count of unique users who viewed',
      },
      sharesCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      // Time-based engagement
      likes24h: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Likes in last 24 hours',
      },
      saves24h: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Saves in last 24 hours',
      },
      views24h: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Views in last 24 hours',
      },
      // Quality metrics
      avgWatchTimeMs: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Average time users spent viewing',
      },
      avgCompletionRate: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 0,
        comment: 'Average completion rate (0-1)',
      },
      // Engagement score for trending algorithm
      engagementScore: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
        comment: 'Calculated score for ranking',
      },
      // Conversion metrics
      clickThroughRate: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 0,
        comment: 'Rate of views that led to restaurant page visit',
      },
      // Last update timestamp for incremental updates
      lastScoreUpdate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'ExperienceEngagement',
      tableName: 'ExperienceEngagements',
      indexes: [
        {
          fields: ['experienceId'],
          unique: true,
        },
        {
          fields: ['engagementScore'],
        },
        {
          fields: ['likesCount'],
        },
        {
          fields: ['viewsCount'],
        },
        {
          fields: ['likes24h'],
        },
        {
          fields: ['lastScoreUpdate'],
        },
      ],
    },
  );

  return ExperienceEngagement;
};
