'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BlogTopic extends Model {
    static associate(models) {
      // Generated blogs
      BlogTopic.belongsTo(models.Blog, {
        foreignKey: 'blogIdHr',
        as: 'blogHr',
      });
      BlogTopic.belongsTo(models.Blog, {
        foreignKey: 'blogIdEn',
        as: 'blogEn',
      });

      // Created by sysadmin
      BlogTopic.belongsTo(models.UserSysadmin, {
        foreignKey: 'createdBy',
        as: 'creator',
      });

      // Approved by sysadmin
      BlogTopic.belongsTo(models.UserSysadmin, {
        foreignKey: 'approvedBy',
        as: 'approver',
      });

      // Generation logs
      BlogTopic.hasMany(models.BlogGenerationLog, {
        foreignKey: 'blogTopicId',
        as: 'generationLogs',
      });
    }
  }

  BlogTopic.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [3, 255],
        },
      },
      topicType: {
        type: DataTypes.ENUM(
          'restaurant_guide',
          'food_trend',
          'seasonal',
          'cuisine_spotlight',
          'neighborhood_guide',
          'tips',
          'industry_news',
          'dinver_feature'
        ),
        allowNull: false,
        defaultValue: 'restaurant_guide',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      targetKeywords: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: [],
      },
      targetAudience: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      primaryLanguage: {
        type: DataTypes.ENUM('hr-HR', 'en-US'),
        allowNull: false,
        defaultValue: 'hr-HR',
      },
      generateBothLanguages: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      scheduledFor: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      priority: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5,
        validate: {
          min: 1,
          max: 10,
        },
      },
      status: {
        type: DataTypes.ENUM(
          'queued',
          'processing',
          'research',
          'outline',
          'writing',
          'editing',
          'seo',
          'image',
          'linkedin',
          'review_ready',
          'approved',
          'published',
          'failed',
          'cancelled'
        ),
        allowNull: false,
        defaultValue: 'queued',
      },
      currentStage: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      blogIdHr: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Blogs',
          key: 'id',
        },
      },
      blogIdEn: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Blogs',
          key: 'id',
        },
      },
      linkedInPostHr: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      linkedInPostEn: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      lastError: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      retryCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      maxRetries: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3,
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'UserSysadmins',
          key: 'id',
        },
      },
      approvedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'UserSysadmins',
          key: 'id',
        },
      },
      approvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'BlogTopic',
      tableName: 'BlogTopics',
      timestamps: true,
      indexes: [
        { fields: ['status', 'scheduledFor'] },
        { fields: ['status', 'priority'] },
        { fields: ['createdBy'] },
      ],
    }
  );

  return BlogTopic;
};
