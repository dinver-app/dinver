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
      Restaurant.belongsTo(models.Organization, {
        foreignKey: 'organizationId',
        as: 'organization',
      });

      Restaurant.belongsToMany(models.User, {
        through: 'UserAdmins',
        foreignKey: 'restaurantId',
        as: 'users',
      });

      Restaurant.belongsToMany(models.User, {
        through: 'UserFavorites',
        foreignKey: 'restaurantId',
        as: 'favoritedBy',
      });

      Restaurant.hasMany(models.MenuItem, {
        foreignKey: 'restaurantId',
        as: 'menuItems',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
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
      address: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      place: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      working_hours_info: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      thumbnail_url: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      place_id: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
      },
      latitude: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      longitude: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      rating: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      user_ratings_total: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      price_level: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      is_open_now: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      opening_hours: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      types: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
      },
      icon_url: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      photo_reference: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      vicinity: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      business_status: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      geometry: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      icon_background_color: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      icon_mask_base_uri: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      photos: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      plus_code: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      food_types: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        allowNull: true,
      },
      establishment_types: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        allowNull: true,
      },
      establishment_perks: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        allowNull: true,
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      website_url: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      fb_url: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      ig_url: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      phone: {
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
      tt_url: {
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
      meal_types: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        allowNull: true,
      },
      price_category_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'PriceCategories',
          key: 'id',
        },
      },
    },
    {
      sequelize,
      modelName: 'Restaurant',
    },
  );
  return Restaurant;
};
