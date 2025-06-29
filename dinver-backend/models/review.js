'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Review extends Model {
    static associate(models) {
      Review.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      Review.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
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
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      restaurantId: {
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
      foodQuality: {
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
      visitDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      photos: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        defaultValue: [],
      },
      isVerifiedReviewer: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      isHidden: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      lastEditedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      editCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      editHistory: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      isEdited: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.lastEditedAt !== null;
        },
      },
      canEdit: {
        type: DataTypes.VIRTUAL,
        get() {
          if (!this.createdAt) return true; // New review

          const daysSinceCreation =
            (Date.now() - this.createdAt) / (1000 * 60 * 60 * 24);
          const isWithinEditWindow = daysSinceCreation <= 7;

          return isWithinEditWindow || this.editCount < 1;
        },
      },
    },
    {
      sequelize,
      modelName: 'Review',
      tableName: 'Reviews',
    },
  );
  return Review;
};
