'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ExperienceMedia extends Model {
    static associate(models) {
      ExperienceMedia.belongsTo(models.Experience, {
        foreignKey: 'experienceId',
        as: 'experience',
      });

      ExperienceMedia.belongsTo(models.MenuItem, {
        foreignKey: 'menuItemId',
        as: 'menuItem',
      });
    }
  }

  ExperienceMedia.init(
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
      kind: {
        type: DataTypes.ENUM('IMAGE'),
        allowNull: false,
        defaultValue: 'IMAGE',
      },
      storageKey: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: 'S3 storage key for the original file',
      },
      cdnUrl: {
        type: DataTypes.STRING(1000),
        allowNull: true,
        comment: 'CloudFront CDN URL for the processed file',
      },
      width: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      height: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      orderIndex: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Order of media in carousel (0-indexed)',
      },
      bytes: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'File size in bytes',
      },
      transcodingStatus: {
        type: DataTypes.ENUM('PENDING', 'PROCESSING', 'DONE', 'FAILED'),
        allowNull: false,
        defaultValue: 'DONE',
      },
      thumbnails: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Array of thumbnail objects: [{w, h, cdnUrl}]',
      },
      mimeType: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      // "Što je na slici?" answer
      caption: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'User description of what is in the image',
      },
      menuItemId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'MenuItems',
          key: 'id',
        },
        onDelete: 'SET NULL',
        comment: 'Link to menu item if user selected from menu',
      },
    },
    {
      sequelize,
      modelName: 'ExperienceMedia',
      tableName: 'ExperienceMedia',
      indexes: [
        {
          fields: ['experienceId'],
        },
        {
          fields: ['experienceId', 'orderIndex'],
        },
      ],
    },
  );

  return ExperienceMedia;
};
