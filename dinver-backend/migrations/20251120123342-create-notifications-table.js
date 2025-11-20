'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Notifications', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Korisnik koji PRIMA notifikaciju',
      },
      type: {
        type: Sequelize.ENUM(
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
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Naslov notifikacije',
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Tekst notifikacije',
      },
      data: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Dodatni podaci (restaurantId, reservationId, itd.)',
      },
      actorUserId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        comment: 'Korisnik koji je napravio akciju (follow, like, itd.)',
      },
      restaurantId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Restoran vezan uz notifikaciju',
      },
      isRead: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Je li notifikacija pročitana',
      },
      readAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Kada je notifikacija pročitana',
      },
      wasSent: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Je li push notifikacija poslana',
      },
      sentAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Kada je push notifikacija poslana',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Create indexes
    await queryInterface.addIndex('Notifications', ['userId', 'isRead'], {
      name: 'notifications_user_read_idx',
    });

    await queryInterface.addIndex('Notifications', ['userId', 'createdAt'], {
      name: 'notifications_user_created_idx',
    });

    await queryInterface.addIndex('Notifications', ['type'], {
      name: 'notifications_type_idx',
    });

    await queryInterface.addIndex('Notifications', ['createdAt'], {
      name: 'notifications_created_idx',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Notifications');
  },
};
