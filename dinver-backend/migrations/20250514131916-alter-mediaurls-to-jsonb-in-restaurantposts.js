'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE "RestaurantPosts"
      ALTER COLUMN "mediaUrls" DROP DEFAULT,
      ALTER COLUMN "mediaUrls" TYPE JSONB
      USING (
        CASE
          WHEN "mediaUrls" IS NULL THEN '[]'::jsonb
          ELSE to_jsonb("mediaUrls")
        END
      ),
      ALTER COLUMN "mediaUrls" SET DEFAULT '[]';
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE "RestaurantPosts"
      ALTER COLUMN "mediaUrls" DROP DEFAULT,
      ALTER COLUMN "mediaUrls" TYPE text[]
      USING (
        CASE
          WHEN "mediaUrls" IS NULL THEN ARRAY[]::text[]
          ELSE array(
            SELECT jsonb_array_elements_text("mediaUrls")
          )
        END
      ),
      ALTER COLUMN "mediaUrls" SET DEFAULT ARRAY[]::text[];
    `);
  },
};
