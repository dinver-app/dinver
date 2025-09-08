'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VisitValidation extends Model {
    static associate(models) {
      VisitValidation.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      VisitValidation.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant',
      });
      VisitValidation.belongsTo(models.Reservation, {
        foreignKey: 'reservationId',
        as: 'reservation',
      });
      VisitValidation.belongsTo(models.User, {
        foreignKey: 'generatedBy',
        as: 'generatedByUser',
      });
    }
  }

  VisitValidation.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      restaurantId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      reservationId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      validationToken: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      usedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      canLeaveReviewUntil: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      generatedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
    },
    {
      sequelize,
      modelName: 'VisitValidation',
    },
  );

  return VisitValidation;
};
