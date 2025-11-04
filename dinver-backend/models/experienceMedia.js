'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ExperienceMedia extends Model {
    static associate(models) {
      ExperienceMedia.belongsTo(models.Experience, {
        foreignKey: 'experienceId',
        as: 'experience',
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
        type: DataTypes.ENUM('IMAGE', 'VIDEO'),
        allowNull: false,
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
        defaultValue: 'PENDING',
      },
      transcodingError: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      thumbnails: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Array of thumbnail objects: [{w, h, cdnUrl}]',
      },
      // Video-specific fields
      videoFormats: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Available video formats: {hls, mp4_720p, mp4_480p, etc.}',
      },
      durationSec: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Video duration in seconds',
      },
      // Image-specific fields
      mimeType: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      // AI/ML analysis
      contentLabels: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Content labels from image/video analysis',
      },
      nsfwScore: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'NSFW detection score from 0-1',
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
        {
          fields: ['transcodingStatus'],
        },
      ],
    },
  );

  return ExperienceMedia;
};
