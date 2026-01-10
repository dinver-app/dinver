'use strict';
const { Model } = require('sequelize');

// Valid update categories
const UPDATE_CATEGORIES = [
  'LIVE_MUSIC',
  'NEW_PRODUCT',
  'NEW_LOCATION',
  'SPECIAL_OFFER',
  'SEASONAL_MENU',
  'EVENT',
  'EXTENDED_HOURS',
  'RESERVATIONS',
  'CHEFS_SPECIAL',
  'FAMILY_FRIENDLY',
  'REOPENING',
  'OTHER',
];

module.exports = (sequelize, DataTypes) => {
  class RestaurantUpdate extends Model {
    static associate(models) {
      RestaurantUpdate.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant',
      });

      RestaurantUpdate.belongsTo(models.User, {
        foreignKey: 'createdByUserId',
        as: 'createdBy',
      });

      RestaurantUpdate.hasMany(models.RestaurantUpdateView, {
        foreignKey: 'updateId',
        as: 'views',
        onDelete: 'CASCADE',
      });
    }

    // Check if update is still active
    isActive() {
      return this.status === 'ACTIVE' && new Date() < new Date(this.expiresAt);
    }
  }

  RestaurantUpdate.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
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
      createdByUserId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      // Content
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          len: [10, 500],
        },
      },
      category: {
        type: DataTypes.ENUM(...UPDATE_CATEGORIES),
        allowNull: false,
      },
      // Optional image
      imageKey: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'S3 storage key for the image',
      },
      imageWidth: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      imageHeight: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      // Lifecycle
      status: {
        type: DataTypes.ENUM('ACTIVE', 'EXPIRED', 'DELETED'),
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
      durationDays: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          isIn: [[1, 3, 7]],
        },
        comment: 'Duration in days: 1, 3, or 7',
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'When the update expires (createdAt + durationDays)',
      },
      // Cache for faster filtering
      cityCached: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Cached city from restaurant for faster filtering',
      },
      latitudeCached: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        comment: 'Cached latitude from restaurant',
      },
      longitudeCached: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        comment: 'Cached longitude from restaurant',
      },
      // Engagement counters
      viewCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      // Language detection for translation feature
      detectedLanguage: {
        type: DataTypes.STRING(5),
        allowNull: true,
        comment: 'Detected language of content (hr, en)',
      },
      // Soft delete
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'RestaurantUpdate',
      tableName: 'RestaurantUpdates',
      paranoid: true, // Enables soft delete with deletedAt
      indexes: [
        {
          fields: ['restaurantId'],
        },
        {
          fields: ['category'],
        },
        {
          fields: ['status', 'expiresAt'],
          name: 'restaurant_updates_status_expires_idx',
        },
        {
          fields: ['cityCached'],
        },
        {
          fields: ['status', 'category'],
          name: 'restaurant_updates_status_category_idx',
        },
        {
          fields: ['createdAt'],
        },
        {
          fields: ['restaurantId', 'createdAt'],
          name: 'restaurant_updates_rate_limit_idx',
        },
        {
          fields: ['detectedLanguage'],
        },
      ],
    },
  );

  // Static properties
  RestaurantUpdate.CATEGORIES = UPDATE_CATEGORIES;

  return RestaurantUpdate;
};
