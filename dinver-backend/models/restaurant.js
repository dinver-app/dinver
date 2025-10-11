'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Restaurant extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Restaurant.belongsToMany(models.User, {
        through: 'UserFavorites',
        foreignKey: 'restaurantId',
        otherKey: 'userId',
        as: 'favoriteUsers',
      });

      Restaurant.belongsToMany(models.User, {
        through: 'UserAdmins',
        foreignKey: 'restaurantId',
        otherKey: 'userId',
        as: 'admins',
      });

      Restaurant.hasMany(models.MenuItem, {
        foreignKey: 'restaurantId',
        as: 'menuItems',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      Restaurant.hasMany(models.Review, {
        foreignKey: 'restaurantId',
        as: 'reviews',
      });

      Restaurant.hasMany(models.RestaurantTranslation, {
        foreignKey: 'restaurantId',
        as: 'translations',
      });

      Restaurant.belongsTo(models.PriceCategory, {
        foreignKey: 'priceCategoryId',
        as: 'priceCategory',
      });

      Restaurant.hasMany(models.RestaurantPost, {
        foreignKey: 'restaurantId',
        as: 'posts',
      });

      Restaurant.hasMany(models.VisitValidation, {
        foreignKey: 'restaurantId',
      });
    }
  }
  Restaurant.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      place: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      latitude: {
        type: DataTypes.DECIMAL,
        allowNull: false,
      },
      longitude: {
        type: DataTypes.DECIMAL,
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      rating: {
        type: DataTypes.DECIMAL,
        allowNull: true,
      },
      foodQuality: {
        type: DataTypes.DECIMAL,
        allowNull: true,
      },
      service: {
        type: DataTypes.DECIMAL,
        allowNull: true,
      },
      atmosphere: {
        type: DataTypes.DECIMAL,
        allowNull: true,
      },
      priceLevel: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      openingHours: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      kitchenHours: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      photos: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
      },
      placeId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      types: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
      },
      workingHoursInfo: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      thumbnailUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      userRatingsTotal: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      isOpenNow: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      iconUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      photoReference: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      vicinity: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      businessStatus: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      geometry: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      iconBackgroundColor: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      iconMaskBaseUri: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      plusCode: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      foodTypes: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        allowNull: true,
      },
      establishmentTypes: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        allowNull: true,
      },
      establishmentPerks: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        allowNull: true,
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      websiteUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      fbUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      igUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      images: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
      },
      ttUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      isClaimed: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      customWorkingDays: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      mealTypes: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        allowNull: true,
      },
      dietaryTypes: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        allowNull: true,
      },
      priceCategoryId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'PriceCategories',
          key: 'id',
        },
      },
      wifiSsid: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      wifiPassword: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      showWifiCredentials: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      reservationEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      subdomain: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      virtualTourUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'URL for virtual tour iframe (e.g., Kuula.co embed URL)',
      },
    },
    {
      sequelize,
      modelName: 'Restaurant',
      tableName: 'Restaurants',
    },
  );
  return Restaurant;
};
