'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {
      // Korisnik koji PRIMA notifikaciju
      Notification.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });

      // Korisnik koji je napravio akciju (follow, like, itd.)
      Notification.belongsTo(models.User, {
        foreignKey: 'actorUserId',
        as: 'actor',
      });

      // Restoran vezan uz notifikaciju
      Notification.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant',
      });
    }
  }

  Notification.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'Korisnik koji PRIMA notifikaciju',
      },
      type: {
        type: DataTypes.ENUM(
          'new_restaurant',
          'new_reservation',
          'reservation_confirmed',
          'reservation_declined',
          'alternative_time_suggested',
          'reservation_cancelled_by_restaurant',
          'new_message_from_user',
          'new_message_from_restaurant',
          'user_followed_you',
        ),
        allowNull: false,
        comment: 'Tip notifikacije',
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Naslov notifikacije',
      },
      body: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Tekst notifikacije',
      },
      data: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Dodatni podaci (restaurantId, reservationId, itd.)',
      },
      actorUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'SET NULL',
        comment: 'Korisnik koji je napravio akciju (follow, like, itd.)',
      },
      restaurantId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'Restoran vezan uz notifikaciju',
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Je li notifikacija pročitana',
      },
      readAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Kada je notifikacija pročitana',
      },
      wasSent: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Je li push notifikacija poslana',
      },
      sentAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Kada je push notifikacija poslana',
      },
    },
    {
      sequelize,
      modelName: 'Notification',
      tableName: 'Notifications',
      timestamps: true,
      indexes: [
        {
          fields: ['userId', 'isRead'],
          name: 'notifications_user_read_idx',
        },
        {
          fields: ['userId', 'createdAt'],
          name: 'notifications_user_created_idx',
        },
        {
          fields: ['type'],
          name: 'notifications_type_idx',
        },
        {
          fields: ['createdAt'],
          name: 'notifications_created_idx',
        },
      ],
    },
  );

  return Notification;
};
