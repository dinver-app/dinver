'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BlogTranslation extends Model {
    static associate(models) {
      BlogTranslation.belongsTo(models.Blog, {
        foreignKey: 'blogId',
        as: 'blog',
        onDelete: 'CASCADE',
      });
    }
  }

  BlogTranslation.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      blogId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Blogs',
          key: 'id',
        },
      },
      language: {
        type: DataTypes.STRING(5),
        allowNull: false,
        validate: {
          isIn: [['en-US', 'hr-HR']],
        },
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [3, 255],
        },
      },
      slug: {
        type: DataTypes.STRING(255),
        allowNull: false,
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
      metaTitle: {
        type: DataTypes.STRING(60),
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
      },
      tags: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
      },
      readingTimeMinutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 60,
        },
      },
    },
    {
      sequelize,
      modelName: 'BlogTranslation',
      tableName: 'BlogTranslations',
      timestamps: true,
      indexes: [
        { fields: ['blogId'] },
        { fields: ['language'] },
        { fields: ['slug'], unique: true },
        {
          fields: ['blogId', 'language'],
          unique: true,
          name: 'blog_translation_unique_language',
        },
      ],
    }
  );

  return BlogTranslation;
};
