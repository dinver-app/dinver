'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserPointsHistory extends Model {
    static associate(models) {
      UserPointsHistory.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      });
      UserPointsHistory.belongsTo(models.Restaurant, {
        foreignKey: 'restaurant_id',
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
        user_id: userId,
        action_type: actionType,
        points,
        reference_id: referenceId,
        restaurant_id: restaurantId,
        description,
      });

      // Ažuriraj ukupne bodove korisnika
      const userPoints = await sequelize.models.UserPoints.findOne({
        where: { user_id: userId },
      });

      if (userPoints) {
        await userPoints.addPoints(points);
      } else {
        // Ako korisnik nema zapis o bodovima, kreiraj novi
        await sequelize.models.UserPoints.create({
          user_id: userId,
          total_points: points,
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
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      action_type: {
        type: DataTypes.ENUM(
          'review_add',
          'review_long',
          'review_with_photo',
          'visit_qr',
          'reservation_bonus',
          'email_verification',
          'phone_verification',
        ),
        allowNull: false,
      },
      points: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      reference_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      restaurant_id: {
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
      underscored: true,
    },
  );

  return UserPointsHistory;
};
