'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Blog extends Model {
    static associate(models) {
      Blog.belongsTo(models.BlogUser, {
        foreignKey: 'authorId',
        as: 'author',
      });
      Blog.hasMany(models.BlogReaction, {
        foreignKey: 'blogId',
        as: 'reactions',
      });
      Blog.hasMany(models.BlogTranslation, {
        foreignKey: 'blogId',
        as: 'translations',
      });
      Blog.belongsTo(models.BlogTopic, {
        foreignKey: 'blogTopicId',
        as: 'topic',
      });
    }
  }

  Blog.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      // Shared fields across all translations
      authorId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'BlogUsers',
          key: 'id',
        },
      },
      featuredImage: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('draft', 'published', 'archived'),
        defaultValue: 'draft',
        allowNull: false,
      },
      publishedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      category: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      shareCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      viewCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      likesCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      dislikesCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      // Link to blog topic (for AI-generated blogs)
      blogTopicId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'BlogTopics',
          key: 'id',
        },
      },
      // ============================================
      // LEGACY FIELDS - kept for backward compatibility
      // Will be migrated to BlogTranslation table
      // ============================================
      title: {
        type: DataTypes.STRING,
        allowNull: true, // Now nullable - use translations
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: true, // Now nullable - use translations
        unique: true,
      },
      content: {
        type: DataTypes.TEXT('long'),
        allowNull: true, // Now nullable - use translations
      },
      excerpt: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      metaTitle: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      metaDescription: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      keywords: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
      },
      tags: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
      },
      readingTimeMinutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      language: {
        type: DataTypes.STRING(5),
        defaultValue: 'hr-HR',
        allowNull: true, // Now nullable - use translations
      },
    },
    {
      sequelize,
      modelName: 'Blog',
      tableName: 'Blogs',
      paranoid: true,
      indexes: [
        { fields: ['authorId'] },
        { fields: ['status', 'publishedAt'] },
        { fields: ['category'] },
        // Note: blogTopicId index is created via migration 20260107185804
      ],
    },
  );

  return Blog;
};
