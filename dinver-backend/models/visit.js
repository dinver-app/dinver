'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Visit extends Model {
    static associate(models) {
      Visit.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });

      Visit.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant',
      });

      Visit.belongsTo(models.User, {
        foreignKey: 'reviewedBy',
        as: 'reviewer',
      });

      Visit.hasOne(models.Experience, {
        foreignKey: 'visitId',
        as: 'experience',
        onDelete: 'SET NULL',
      });

      Visit.hasOne(models.Receipt, {
        foreignKey: 'visitId',
        as: 'receipt',
        onDelete: 'SET NULL',
      });
    }
  }

  Visit.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      restaurantId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
      },
      receiptImageUrl: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED', 'RETAKE_NEEDED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      wasInMustVisit: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      visitDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      submittedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      reviewedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      reviewedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      rejectionReason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      retakeDeadline: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      experienceDeadline: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      taggedBuddies: {
        type: DataTypes.ARRAY(DataTypes.UUID),
        allowNull: true,
        defaultValue: [],
      },
    },
    {
      sequelize,
      modelName: 'Visit',
      tableName: 'Visits',
    },
  );

  return Visit;
};
