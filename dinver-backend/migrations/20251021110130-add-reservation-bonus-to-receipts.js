'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add hasReservationBonus field
    await queryInterface.addColumn('Receipts', 'hasReservationBonus', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment:
        'Whether this receipt qualifies for reservation bonus (20% extra points)',
    });

    // Add reservationId field
    await queryInterface.addColumn('Receipts', 'reservationId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Reservations',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'ID of the reservation that triggered the bonus',
    });

    // Change pointsAwarded from INTEGER to DECIMAL(10,2)
    await queryInterface.changeColumn('Receipts', 'pointsAwarded', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment:
        'Points awarded for this receipt (calculated on approval) - now supports decimals',
    });

    // Update existing records to convert integer points to decimal
    await queryInterface.sequelize.query(`
      UPDATE "Receipts" 
      SET "pointsAwarded" = "pointsAwarded"::DECIMAL(10,2) 
      WHERE "pointsAwarded" IS NOT NULL
    `);
  },

  async down(queryInterface, Sequelize) {
    // Remove hasReservationBonus field
    await queryInterface.removeColumn('Receipts', 'hasReservationBonus');

    // Remove reservationId field
    await queryInterface.removeColumn('Receipts', 'reservationId');

    // Revert pointsAwarded back to INTEGER
    await queryInterface.changeColumn('Receipts', 'pointsAwarded', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Points awarded for this receipt (calculated on approval)',
    });
  },
};
