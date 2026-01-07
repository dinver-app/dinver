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
    }
  }

  Blog.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [3, 255],
        },
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
          is: /^[a-z0-9-]+$/,
        },
      },
      content: {
        type: DataTypes.TEXT('long'),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      excerpt: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
          len: [0, 500],
        },
      },
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
        validate: {
          isUrl: true,
        },
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
      metaTitle: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [0, 60],
        },
      },
      metaDescription: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
          len: [0, 160],
        },
      },
      keywords: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
        validate: {
          isValidKeywordsArray(value) {
            if (!Array.isArray(value)) {
              throw new Error('Keywords must be an array');
            }
            if (value.length > 10) {
              throw new Error('Maximum 10 keywords allowed');
            }
            value.forEach((keyword) => {
              if (typeof keyword !== 'string' || keyword.length > 50) {
                throw new Error(
                  'Each keyword must be a string of maximum 50 characters',
                );
              }
            });
          },
        },
      },
      category: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      tags: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
        validate: {
          isValidTagsArray(value) {
            if (!Array.isArray(value)) {
              throw new Error('Tags must be an array');
            }
            if (value.length > 15) {
              throw new Error('Maximum 15 tags allowed');
            }
            value.forEach((tag) => {
              if (typeof tag !== 'string' || tag.length > 30) {
                throw new Error(
                  'Each tag must be a string of maximum 30 characters',
                );
              }
            });
          },
        },
      },
      readingTimeMinutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 60,
        },
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
      language: {
        type: DataTypes.STRING(5),
        defaultValue: 'en-US',
        allowNull: false,
        validate: {
          isIn: [['en-US', 'hr-HR']], // Add more languages as needed
        },
      },
    },
    {
      sequelize,
      modelName: 'Blog',
      tableName: 'Blogs',
      paranoid: true, // Enables soft deletes
      indexes: [
        { fields: ['authorId'] },
        { fields: ['status', 'publishedAt'] },
        { fields: ['category'] },
        { fields: ['language'] },
        { fields: ['slug'], unique: true },
      ],
    },
  );

  return Blog;
};
