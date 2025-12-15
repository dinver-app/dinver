'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // PostgreSQL enum change requires converting through TEXT type
    // 1. Convert column to TEXT (preserves values)
    // 2. Drop old enum
    // 3. Create new enum
    // 4. Update data (coffee -> drinks, snack -> null)
    // 5. Convert column back to new enum

    // Step 1: Convert column to TEXT
    await queryInterface.sequelize.query(`
      ALTER TABLE "Experiences"
      ALTER COLUMN "mealType" TYPE TEXT
    `);

    // Step 2: Drop old enum
    await queryInterface.sequelize.query(`
      DROP TYPE "enum_Experiences_mealType"
    `);

    // Step 3: Create new enum with updated values (added 'sweet')
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_Experiences_mealType" AS ENUM('breakfast', 'brunch', 'lunch', 'dinner', 'sweet', 'drinks')
    `);

    // Step 4: Update existing data
    // coffee -> drinks (kava spada pod piće)
    await queryInterface.sequelize.query(`
      UPDATE "Experiences"
      SET "mealType" = 'drinks'
      WHERE "mealType" = 'coffee'
    `);

    // snack -> sweet (closest match for old snack values)
    await queryInterface.sequelize.query(`
      UPDATE "Experiences"
      SET "mealType" = 'sweet'
      WHERE "mealType" = 'snack'
    `);

    // Step 5: Convert column back to enum
    await queryInterface.sequelize.query(`
      ALTER TABLE "Experiences"
      ALTER COLUMN "mealType" TYPE "enum_Experiences_mealType"
      USING "mealType"::"enum_Experiences_mealType"
    `);
  },

  async down(queryInterface, Sequelize) {
    // Revert: recreate old enum

    // Step 1: Convert column to TEXT
    await queryInterface.sequelize.query(`
      ALTER TABLE "Experiences"
      ALTER COLUMN "mealType" TYPE TEXT
    `);

    // Step 2: Drop new enum
    await queryInterface.sequelize.query(`
      DROP TYPE "enum_Experiences_mealType"
    `);

    // Step 3: Create old enum
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_Experiences_mealType" AS ENUM('breakfast', 'brunch', 'lunch', 'dinner', 'coffee', 'snack')
    `);

    // Step 4: Update data back
    // drinks -> coffee
    await queryInterface.sequelize.query(`
      UPDATE "Experiences"
      SET "mealType" = 'coffee'
      WHERE "mealType" = 'drinks'
    `);

    // sweet -> snack
    await queryInterface.sequelize.query(`
      UPDATE "Experiences"
      SET "mealType" = 'snack'
      WHERE "mealType" = 'sweet'
    `);

    // Step 5: Convert column back to enum
    await queryInterface.sequelize.query(`
      ALTER TABLE "Experiences"
      ALTER COLUMN "mealType" TYPE "enum_Experiences_mealType"
      USING "mealType"::"enum_Experiences_mealType"
    `);
  },
};
