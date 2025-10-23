'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ReservationEvent extends Model {
    static associate(models) {
      ReservationEvent.belongsTo(models.Reservation, {
        foreignKey: 'reservationId',
        as: 'reservation',
      });
      ReservationEvent.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }

    // Helper metoda za kreiranje događaja
    static async logEvent({
      reservationId,
      userId,
      event,
      oldStatus,
      newStatus,
      metadata = {},
    }) {
      return await this.create({
        reservationId,
        userId, // Can be null for custom reservations
        event,
        oldStatus,
        newStatus,
        metadata,
      });
    }
  }

  ReservationEvent.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      reservationId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      event: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: [
            [
              'created',
              'confirmed',
              'declined',
              'cancelled_by_user',
              'cancelled_by_restaurant',
              'suggested_alt',
              'accepted_alt',
              'completed',
              'no_show',
              'modified',
            ],
          ],
        },
      },
      oldStatus: {
        type: DataTypes.ENUM(
          'pending',
          'confirmed',
          'declined',
          'cancelled_by_user',
          'cancelled_by_restaurant',
          'suggested_alt',
          'completed',
          'no_show',
        ),
        allowNull: true,
      },
      newStatus: {
        type: DataTypes.ENUM(
          'pending',
          'confirmed',
          'declined',
          'cancelled_by_user',
          'cancelled_by_restaurant',
          'suggested_alt',
          'completed',
          'no_show',
        ),
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
    },
    {
      sequelize,
      modelName: 'ReservationEvent',
      timestamps: true,
      updatedAt: false, // Ne trebamo updatedAt jer se događaji ne mijenjaju
    },
  );

  return ReservationEvent;
};
