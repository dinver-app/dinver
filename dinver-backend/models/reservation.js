'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Reservation extends Model {
    static associate(models) {
      Reservation.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      Reservation.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant',
      });
      Reservation.hasMany(models.ReservationEvent, {
        foreignKey: 'reservationId',
        as: 'events',
      });
      Reservation.hasMany(models.ReservationMessage, {
        foreignKey: 'reservationId',
        as: 'messages',
      });
    }

    // Helper metode za provjeru statusa
    isPending() {
      return this.status === 'pending';
    }

    isConfirmed() {
      return this.status === 'confirmed';
    }

    isDeclined() {
      return this.status === 'declined';
    }

    isCancelled() {
      return ['cancelled_by_user', 'cancelled_by_restaurant'].includes(
        this.status,
      );
    }

    hasSuggestedTime() {
      return this.status === 'suggested_alt';
    }

    isCompleted() {
      return ['completed', 'no_show'].includes(this.status);
    }

    // Helper metoda za provjeru može li se otkazati
    canBeCancelled() {
      return (
        ['pending', 'confirmed', 'suggested_alt'].includes(this.status) &&
        !this.isPast()
      );
    }

    // Helper metoda za provjeru može li se odgovoriti
    canBeResponded() {
      return this.status === 'pending' && !this.isPast();
    }

    // Helper metoda za provjeru je li u prošlosti
    isPast() {
      const reservationDateTime = new Date(this.date + 'T' + this.time);
      return reservationDateTime < new Date();
    }

    // Helper metoda za provjeru je li thread aktivan
    isThreadActive() {
      if (this.isCompleted()) {
        const THREAD_EXPIRY_HOURS = 24;
        const expiryTime = new Date(this.updatedAt);
        expiryTime.setHours(expiryTime.getHours() + THREAD_EXPIRY_HOURS);
        return new Date() < expiryTime;
      }
      return !this.isPast();
    }

    // Helper metoda za provjeru može li se slati poruke
    canSendMessages() {
      return this.isThreadActive() && !this.isCancelled() && !this.isDeclined();
    }
  }

  Reservation.init(
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
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
          isDate: true,
          isFuture(value) {
            if (new Date(value) < new Date().setHours(0, 0, 0, 0)) {
              throw new Error('Reservation date must be in the future');
            }
          },
        },
      },
      time: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      guests: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 99,
        },
      },
      status: {
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
        defaultValue: 'pending',
        allowNull: false,
      },
      noteFromUser: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      noteFromOwner: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      suggestedDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      suggestedTime: {
        type: DataTypes.TIME,
        allowNull: true,
      },
      respondedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      cancelledAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      threadActive: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.isThreadActive();
        },
      },
      canSendMessages: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.canSendMessages();
        },
      },
    },
    {
      sequelize,
      modelName: 'Reservation',
      hooks: {
        beforeValidate: (reservation) => {
          // Provjera je li datum i vrijeme u budućnosti
          if (reservation.date && reservation.time) {
            const reservationDateTime = new Date(
              reservation.date + 'T' + reservation.time,
            );
            if (reservationDateTime < new Date()) {
              throw new Error('Reservation must be in the future');
            }
          }
        },
      },
    },
  );

  return Reservation;
};
