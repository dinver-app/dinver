'use strict';

module.exports = (sequelize, DataTypes) => {
  const RestaurantPost = sequelize.define(
    'RestaurantPost',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      restaurantId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      mediaUrls: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      mediaType: {
        type: DataTypes.ENUM('video', 'carousel'),
        allowNull: false,
      },
      tags: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: [],
      },
      city: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      likeCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      viewCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      shareCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      saveCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      avgWatchTime: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      completionRate: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      engagementScore: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      viralScore: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      trendingScore: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      peakHours: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      tableName: 'RestaurantPosts',
      indexes: [
        {
          name: 'posts_engagement_idx',
          fields: ['engagementScore', 'createdAt'],
        },
        {
          name: 'posts_viral_idx',
          fields: ['viralScore', 'createdAt'],
        },
        {
          name: 'posts_trending_idx',
          fields: ['trendingScore', 'createdAt'],
        },
      ],
    },
  );

  RestaurantPost.associate = (models) => {
    RestaurantPost.belongsTo(models.Restaurant, {
      foreignKey: 'restaurantId',
      as: 'restaurant',
    });
    RestaurantPost.hasMany(models.PostView, {
      foreignKey: 'postId',
      as: 'views',
      onDelete: 'CASCADE',
    });
    RestaurantPost.hasMany(models.PostInteraction, {
      foreignKey: 'postId',
      as: 'interactions',
      onDelete: 'CASCADE',
    });
  };

  return RestaurantPost;
};
