'use strict';
const { Model } = require('sequelize');
const { getI18nForLanguage } = require('../utils/i18n');

module.exports = (sequelize, DataTypes) => {
  class ReservationMessage extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      ReservationMessage.belongsTo(models.Reservation, {
        foreignKey: 'reservationId',
        as: 'reservation',
      });
      ReservationMessage.belongsTo(models.User, {
        foreignKey: 'senderId',
        as: 'sender',
      });
    }

    // Helper metoda za kreiranje sistemske poruke
    static async createSystemMessage(reservationId, content, metadata = {}) {
      return await this.create({
        reservationId,
        messageType: 'system',
        content,
        metadata,
      });
    }

    // Helper metoda za kreiranje poruke o promjeni termina
    static async createTimeChangeMessage(
      reservationId,
      userId,
      oldDate,
      oldTime,
      newDate,
      newTime,
      language = 'hr',
    ) {
      const t = getI18nForLanguage(language);
      return await this.create({
        reservationId,
        senderId: userId,
        messageType: 'system',
        content: t('reservationThread.timeChangeSuggested'),
        metadata: {
          type: 'time_change',
          oldDate,
          oldTime,
          newDate,
          newTime,
        },
      });
    }

    // Helper metoda za kreiranje poruke o statusu
    static async createStatusMessage(
      reservationId,
      userId,
      oldStatus,
      newStatus,
      reason = null,
      language = 'hr',
    ) {
      const t = getI18nForLanguage(language);

      const statusMessagesKeys = {
        confirmed: 'reservationThread.reservationConfirmed',
        declined: 'reservationThread.reservationDeclined',
        cancelled_by_user: 'reservationThread.reservationCancelledByUser',
        cancelled_by_restaurant:
          'reservationThread.reservationCancelledByRestaurant',
        suggested_alt: 'reservationThread.alternativeTimeSuggested',
        completed: 'reservationThread.reservationCompleted',
        no_show: 'reservationThread.noShow',
      };

      const messageKey = statusMessagesKeys[newStatus];
      const content = messageKey
        ? t(messageKey)
        : `Status promijenjen u ${newStatus}`;

      return await this.create({
        reservationId,
        senderId: userId,
        messageType: 'system',
        content,
        metadata: {
          type: 'status_change',
          oldStatus,
          newStatus,
          reason,
        },
      });
    }

    // Helper metoda za provjeru je li poruka sistemska
    isSystemMessage() {
      return this.messageType === 'system';
    }

    // Helper metoda za provjeru je li poruka sugestija
    isSuggestion() {
      return this.messageType === 'suggestion';
    }

    // Helper metoda za formatiranje poruke za prikaz
    getFormattedContent() {
      if (this.isSystemMessage() && this.metadata?.type === 'time_change') {
        return `Promjena termina: ${this.metadata.oldDate} ${this.metadata.oldTime} → ${this.metadata.newDate} ${this.metadata.newTime}`;
      }
      return this.content;
    }
  }
  ReservationMessage.init(
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
      senderId: {
        type: DataTypes.UUID,
        allowNull: true, // null for system messages
      },
      messageType: {
        type: DataTypes.ENUM('system', 'user', 'suggestion'),
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      metadata: {
        type: DataTypes.JSONB,
        defaultValue: {},
      },
      readAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      formattedContent: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.getFormattedContent();
        },
      },
    },
    {
      sequelize,
      modelName: 'ReservationMessage',
      indexes: [
        {
          fields: ['reservationId', 'createdAt'],
        },
        {
          fields: ['senderId', 'createdAt'],
        },
      ],
    },
  );
  return ReservationMessage;
};
