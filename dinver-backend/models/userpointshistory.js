'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserPointsHistory extends Model {
    static associate(models) {
      UserPointsHistory.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      UserPointsHistory.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant',
      });
    }

    // Helper metoda za kreiranje zapisa o bodovima
    static async logPoints({
      userId,
      actionType,
      points,
      referenceId = null,
      restaurantId = null,
      description,
    }) {
      const history = await this.create({
        userId,
        actionType,
        points,
        referenceId,
        restaurantId,
        description,
      });

      // Ažuriraj ukupne bodove korisnika
      const userPoints = await this.sequelize.models.UserPoints.findOne({
        where: { userId },
      });

      if (userPoints) {
        await userPoints.addPoints(points);
      } else {
        // Ako korisnik nema zapis o bodovima, kreiraj novi
        await this.sequelize.models.UserPoints.create({
          userId,
          totalPoints: points,
        });
      }

      return history;
    }
  }

  UserPointsHistory.init(
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
        allowNull: true,
      },
      actionType: {
        type: DataTypes.ENUM(
          'review_add',
          'review_long',
          'review_with_photo',
          'visit_qr',
          'reservation_visit',
          'achievement_unlocked',
          // Referral-related action types
          'referral_registration_referrer',
          'referral_registration_referred',
          'referral_visit_referrer',
          // Points deduction (spending)
          'points_spent_coupon',
          // Receipt validation
          'receipt_upload',
        ),
        allowNull: false,
      },
      points: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      referenceId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'UserPointsHistory',
      tableName: 'UserPointsHistory',
      freezeTableName: true,
    },
  );

  return UserPointsHistory;
};
