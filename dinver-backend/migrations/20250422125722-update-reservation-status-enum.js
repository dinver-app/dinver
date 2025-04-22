'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Prvo pretvaramo ENUM u TEXT
    await queryInterface.sequelize.query(`
      ALTER TABLE "Reservations" 
      ALTER COLUMN status TYPE TEXT;
    `);

    // 2. Brišemo stari ENUM tip
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_Reservations_status";
    `);

    // 3. Kreiramo novi ENUM tip
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_Reservations_status" AS ENUM(
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

    // 4. Ažuriramo postojeće 'confirmed' statuse u 'pending' za nove rezervacije
    await queryInterface.sequelize.query(`
      UPDATE "Reservations" 
      SET status = 'pending' 
      WHERE status = 'confirmed' AND "createdAt" > NOW() - INTERVAL '5 minutes';
    `);

    // 5. Konvertiramo kolonu nazad u ENUM tip
    await queryInterface.sequelize.query(`
      ALTER TABLE "Reservations"
      ALTER COLUMN status TYPE "enum_Reservations_status" USING status::"enum_Reservations_status",
      ALTER COLUMN status SET DEFAULT 'pending',
      ALTER COLUMN status SET NOT NULL;
    `);
  },

  async down(queryInterface, Sequelize) {
    // 1. Prvo pretvaramo u TEXT
    await queryInterface.sequelize.query(`
      ALTER TABLE "Reservations" 
      ALTER COLUMN status TYPE TEXT;
    `);

    // 2. Brišemo novi ENUM tip
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_Reservations_status";
    `);

    // 3. Kreiramo originalni ENUM tip
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_Reservations_status" AS ENUM(
        'confirmed',
        'cancelled',
        'completed',
        'no-show'
      );
    `);

    // 4. Konvertiramo kolonu nazad u originalni ENUM tip
    await queryInterface.sequelize.query(`
      ALTER TABLE "Reservations"
      ALTER COLUMN status TYPE "enum_Reservations_status" USING 
        CASE status 
          WHEN 'pending' THEN 'confirmed'
          WHEN 'declined' THEN 'cancelled'
          WHEN 'cancelled_by_user' THEN 'cancelled'
          WHEN 'cancelled_by_restaurant' THEN 'cancelled'
          WHEN 'suggested_alt' THEN 'confirmed'
          ELSE status
        END::"enum_Reservations_status",
      ALTER COLUMN status SET DEFAULT 'confirmed',
      ALTER COLUMN status SET NOT NULL;
    `);
  },
};
