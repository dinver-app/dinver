'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Prvo kreiramo enum tip za status rezervacije
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_reservation_status" AS ENUM (
        'pending',
        'confirmed',
        'declined',
        'cancelled_by_user',
        'cancelled_by_restaurant',
        'suggested_alt',
        'completed',
        'no_show'
      );
    `);

    // Kreiramo tablicu rezervacija
    await queryInterface.createTable('Reservations', {
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
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      restaurantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      time: {
        type: Sequelize.TIME,
        allowNull: false,
      },
      guests: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 99,
        },
      },
      status: {
        type: 'enum_reservation_status',
        defaultValue: 'pending',
        allowNull: false,
      },
      noteFromUser: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      noteFromOwner: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      suggestedDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      suggestedTime: {
        type: Sequelize.TIME,
        allowNull: true,
      },
      respondedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      cancelledAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Kreiramo tablicu za logiranje događaja rezervacija
    await queryInterface.createTable('ReservationEvents', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      reservationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Reservations',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      event: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      oldStatus: {
        type: 'enum_reservation_status',
        allowNull: true,
      },
      newStatus: {
        type: 'enum_reservation_status',
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Dodajemo indekse za brže pretraživanje
    await queryInterface.addIndex('Reservations', ['userId']);
    await queryInterface.addIndex('Reservations', ['restaurantId']);
    await queryInterface.addIndex('Reservations', ['status']);
    await queryInterface.addIndex('Reservations', ['date']);
    await queryInterface.addIndex('ReservationEvents', ['reservationId']);
    await queryInterface.addIndex('ReservationEvents', ['userId']);
    await queryInterface.addIndex('ReservationEvents', ['event']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ReservationEvents');
    await queryInterface.dropTable('Reservations');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_reservation_status";',
    );
  },
};
