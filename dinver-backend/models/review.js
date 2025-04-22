'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Review extends Model {
    static associate(models) {
      Review.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      });
      Review.belongsTo(models.Restaurant, {
        foreignKey: 'restaurant_id',
        as: 'restaurant',
      });
    }
  }

  Review.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      restaurant_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      rating: {
        type: DataTypes.FLOAT,
        allowNull: false,
        validate: {
          min: 1,
          max: 5,
        },
      },
      food_quality: {
        type: DataTypes.FLOAT,
        allowNull: false,
        validate: {
          min: 1,
          max: 5,
        },
      },
      service: {
        type: DataTypes.FLOAT,
        allowNull: false,
        validate: {
          min: 1,
          max: 5,
        },
      },
      atmosphere: {
        type: DataTypes.FLOAT,
        allowNull: false,
        validate: {
          min: 1,
          max: 5,
        },
      },
      value_for_money: {
        type: DataTypes.FLOAT,
        allowNull: false,
        validate: {
          min: 1,
          max: 5,
        },
      },
      text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      photos: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
      },
      is_verified_reviewer: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_hidden: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      last_edited_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      edit_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      edit_history: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      is_edited: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.last_edited_at !== null;
        },
      },
      can_edit: {
        type: DataTypes.VIRTUAL,
        get() {
          if (!this.created_at) return true; // New review

          const daysSinceCreation =
            (Date.now() - this.created_at) / (1000 * 60 * 60 * 24);
          const isWithinEditWindow = daysSinceCreation <= 7;

          return isWithinEditWindow || this.edit_count < 1;
        },
      },
    },
    {
      sequelize,
      modelName: 'Review',
      tableName: 'Reviews',
      underscored: true,
    },
  );
  return Review;
};
