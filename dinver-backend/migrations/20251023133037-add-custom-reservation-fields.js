'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add new fields for custom reservations
    await queryInterface.addColumn('Reservations', 'isCustomReservation', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('Reservations', 'guestName', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('Reservations', 'guestPhone', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('Reservations', 'guestEmail', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // Make userId nullable to support custom reservations
    await queryInterface.changeColumn('Reservations', 'userId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    // Make userId nullable in ReservationEvents as well
    await queryInterface.changeColumn('ReservationEvents', 'userId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    // Add index for custom reservations
    await queryInterface.addIndex('Reservations', ['isCustomReservation']);
  },

  async down(queryInterface, Sequelize) {
    // Remove the index
    await queryInterface.removeIndex('Reservations', ['isCustomReservation']);

    // Remove custom reservation fields
    await queryInterface.removeColumn('Reservations', 'isCustomReservation');
    await queryInterface.removeColumn('Reservations', 'guestName');
    await queryInterface.removeColumn('Reservations', 'guestPhone');
    await queryInterface.removeColumn('Reservations', 'guestEmail');

    // Revert userId to not nullable
    await queryInterface.changeColumn('Reservations', 'userId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.changeColumn('ReservationEvents', 'userId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
  },
};
