'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop all existing foreign key constraints on userId
    await queryInterface.sequelize.query(`
      ALTER TABLE "AiThreads"
      DROP CONSTRAINT IF EXISTS "AiThreads_userId_fkey",
      DROP CONSTRAINT IF EXISTS "AiThreads_userId_fkey1",
      DROP CONSTRAINT IF EXISTS "AiThreads_userId_fkey2";
    `);

    // Change userId column to allow NULL
    await queryInterface.sequelize.query(`
      ALTER TABLE "AiThreads"
      ALTER COLUMN "userId" DROP NOT NULL;
    `);

    // Add back a single foreign key constraint
    await queryInterface.sequelize.query(`
      ALTER TABLE "AiThreads"
      ADD CONSTRAINT "AiThreads_userId_fkey"
      FOREIGN KEY ("userId")
      REFERENCES "Users"(id)
      ON UPDATE CASCADE
      ON DELETE CASCADE;
    `);
  },

  async down(queryInterface, Sequelize) {
    // Drop the foreign key
    await queryInterface.sequelize.query(`
      ALTER TABLE "AiThreads"
      DROP CONSTRAINT IF EXISTS "AiThreads_userId_fkey";
    `);

    // Make userId NOT NULL again
    await queryInterface.sequelize.query(`
      ALTER TABLE "AiThreads"
      ALTER COLUMN "userId" SET NOT NULL;
    `);

    // Add back the foreign key constraint
    await queryInterface.sequelize.query(`
      ALTER TABLE "AiThreads"
      ADD CONSTRAINT "AiThreads_userId_fkey"
      FOREIGN KEY ("userId")
      REFERENCES "Users"(id)
      ON UPDATE CASCADE
      ON DELETE CASCADE;
    `);
  },
};
