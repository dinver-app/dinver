'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Experience extends Model {
    static associate(models) {
      Experience.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'author',
      });

      Experience.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant',
      });

      Experience.hasMany(models.ExperienceMedia, {
        foreignKey: 'experienceId',
        as: 'media',
        onDelete: 'CASCADE',
      });

      Experience.hasMany(models.ExperienceLike, {
        foreignKey: 'experienceId',
        as: 'likes',
        onDelete: 'CASCADE',
      });

      Experience.hasMany(models.ExperienceSave, {
        foreignKey: 'experienceId',
        as: 'saves',
        onDelete: 'CASCADE',
      });

      Experience.hasMany(models.ExperienceView, {
        foreignKey: 'experienceId',
        as: 'views',
        onDelete: 'CASCADE',
      });

      Experience.hasOne(models.ExperienceEngagement, {
        foreignKey: 'experienceId',
        as: 'engagement',
        onDelete: 'CASCADE',
      });
    }

    // Helper method to check if user has liked this experience
    async hasUserLiked(userId, cycleId) {
      const ExperienceLike = sequelize.models.ExperienceLike;
      const like = await ExperienceLike.findOne({
        where: {
          experienceId: this.id,
          userId: userId,
          cycleId: cycleId,
        },
      });
      return !!like;
    }

    // Helper method to check if user has saved this experience
    async hasUserSaved(userId) {
      const ExperienceSave = sequelize.models.ExperienceSave;
      const save = await ExperienceSave.findOne({
        where: {
          experienceId: this.id,
          userId: userId,
        },
      });
      return !!save;
    }
  }

  Experience.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      restaurantId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      status: {
        type: DataTypes.ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ratingAmbience: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 5,
        },
      },
      ratingService: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 5,
        },
      },
      ratingPrice: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 5,
        },
      },
      mediaKind: {
        type: DataTypes.ENUM('VIDEO', 'CAROUSEL'),
        allowNull: false,
      },
      durationSec: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 30,
        },
      },
      coverMediaId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'ExperienceMedia',
          key: 'id',
        },
      },
      cityCached: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      approvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      rejectedReason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      visibility: {
        type: DataTypes.ENUM('ALL', 'FOLLOWERS', 'BUDDIES'),
        allowNull: false,
        defaultValue: 'ALL',
      },
      // AI/ML scores for moderation
      nsfwScore: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'NSFW detection score from 0-1, higher = more NSFW',
      },
      brandSafetyScore: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Brand safety score from 0-1, higher = safer',
      },
      // Engagement metrics (cached from ExperienceEngagement)
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
      sharesCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      // Engagement score for trending algorithm
      engagementScore: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
        comment: 'Weighted score for ranking: likes, saves, views, recency',
      },
    },
    {
      sequelize,
      modelName: 'Experience',
      tableName: 'Experiences',
      indexes: [
        {
          fields: ['userId'],
        },
        {
          fields: ['restaurantId'],
        },
        {
          fields: ['status'],
        },
        {
          fields: ['cityCached'],
        },
        {
          fields: ['status', 'cityCached'],
        },
        {
          fields: ['createdAt'],
        },
        {
          fields: ['status', 'engagementScore'],
        },
        {
          fields: ['status', 'createdAt'],
        },
      ],
    },
  );

  return Experience;
};
