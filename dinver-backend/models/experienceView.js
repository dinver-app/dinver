'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ExperienceView extends Model {
    static associate(models) {
      ExperienceView.belongsTo(models.Experience, {
        foreignKey: 'experienceId',
        as: 'experience',
      });

      ExperienceView.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }

  ExperienceView.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      experienceId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Experiences',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'Null for anonymous views',
      },
      // View quality metrics
      durationMs: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'How long the user viewed the experience in milliseconds',
      },
      completionRate: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Percentage of video/carousel viewed (0-1)',
      },
      // Context
      source: {
        type: DataTypes.ENUM(
          'EXPLORE_FEED',
          'TRENDING_FEED',
          'USER_PROFILE',
          'RESTAURANT_PAGE',
          'DIRECT_LINK',
          'PUSH_NOTIFICATION',
          'MY_MAP',
        ),
        allowNull: true,
        comment: 'Where the user came from',
      },
      // Anti-fraud
      deviceId: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
      userAgent: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // Session tracking
      sessionId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Session identifier for tracking user journey',
      },
    },
    {
      sequelize,
      modelName: 'ExperienceView',
      tableName: 'ExperienceViews',
      indexes: [
        {
          fields: ['experienceId'],
        },
        {
          fields: ['userId'],
        },
        {
          fields: ['createdAt'],
        },
        {
          fields: ['experienceId', 'createdAt'],
        },
        {
          fields: ['sessionId'],
        },
        {
          fields: ['source'],
        },
      ],
    },
  );

  return ExperienceView;
};
