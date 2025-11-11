'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        'ALTER TABLE "Reservations" ALTER COLUMN "userId" DROP NOT NULL;',
        { transaction },
      );
      await queryInterface.sequelize.query(
        'ALTER TABLE "ReservationEvents" ALTER COLUMN "userId" DROP NOT NULL;',
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        'ALTER TABLE "ReservationEvents" ALTER COLUMN "userId" SET NOT NULL;',
        { transaction },
      );
      await queryInterface.sequelize.query(
        'ALTER TABLE "Reservations" ALTER COLUMN "userId" SET NOT NULL;',
        { transaction },
      );
    });
  },
};
