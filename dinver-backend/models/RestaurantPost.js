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
    },
    {
      tableName: 'RestaurantPosts',
    },
  );

  RestaurantPost.associate = (models) => {
    RestaurantPost.belongsTo(models.Restaurant, {
      foreignKey: 'restaurantId',
      as: 'restaurant',
    });
    RestaurantPost.hasMany(models.RestaurantPostLike, {
      foreignKey: 'postId',
      as: 'likes',
    });
  };

  return RestaurantPost;
};
