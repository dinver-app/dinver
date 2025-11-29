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

      Experience.belongsTo(models.Visit, {
        foreignKey: 'visitId',
        as: 'visit',
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
    }

    // Helper method to check if user has liked this experience
    async hasUserLiked(userId) {
      const ExperienceLike = sequelize.models.ExperienceLike;
      const like = await ExperienceLike.findOne({
        where: {
          experienceId: this.id,
          userId: userId,
        },
      });
      return !!like;
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
        allowNull: true,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      visitId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Visits',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      status: {
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // Ratings (1.0-5.0 with one decimal)
      foodRating: {
        type: DataTypes.DECIMAL(2, 1),
        allowNull: true,
        validate: {
          min: 1.0,
          max: 5.0,
        },
      },
      ambienceRating: {
        type: DataTypes.DECIMAL(2, 1),
        allowNull: true,
        validate: {
          min: 1.0,
          max: 5.0,
        },
      },
      serviceRating: {
        type: DataTypes.DECIMAL(2, 1),
        allowNull: true,
        validate: {
          min: 1.0,
          max: 5.0,
        },
      },
      overallRating: {
        type: DataTypes.DECIMAL(2, 1),
        allowNull: true,
        comment: 'Average of food, ambience, service ratings (1.0-5.0)',
      },
      // Metadata
      mealType: {
        type: DataTypes.ENUM('breakfast', 'brunch', 'lunch', 'dinner', 'sweet', 'drinks'),
        allowNull: true,
      },
      // Cached data for filtering
      cityCached: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      // Engagement counters
      likesCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      sharesCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      // Timestamps
      publishedAt: {
        type: DataTypes.DATE,
        allowNull: true,
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
          fields: ['visitId'],
        },
        {
          fields: ['status'],
        },
        {
          fields: ['cityCached'],
        },
        {
          fields: ['mealType'],
        },
        {
          fields: ['status', 'publishedAt'],
        },
        {
          fields: ['createdAt'],
        },
      ],
    },
  );

  return Experience;
};
