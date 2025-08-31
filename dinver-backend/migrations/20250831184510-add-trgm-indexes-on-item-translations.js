'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Conditionally create trigram indexes only if pg_trgm is enabled
    const [rows] = await queryInterface.sequelize.query(
      "SELECT COUNT(*)::int AS count FROM pg_extension WHERE extname = 'pg_trgm';",
    );
    const hasTrgm = Array.isArray(rows) ? rows[0]?.count > 0 : rows.count > 0;
    if (hasTrgm) {
      await queryInterface.sequelize.query(
        'CREATE INDEX IF NOT EXISTS idx_menu_item_translations_name_trgm ON "MenuItemTranslations" USING GIN (name gin_trgm_ops);',
      );
      await queryInterface.sequelize.query(
        'CREATE INDEX IF NOT EXISTS idx_drink_item_translations_name_trgm ON "DrinkItemTranslations" USING GIN (name gin_trgm_ops);',
      );
    } else {
      // Extension not available; skip to keep migration green
      // Consider enabling pg_trgm at DB level to benefit from these indexes
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS idx_menu_item_translations_name_trgm;',
    );
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS idx_drink_item_translations_name_trgm;',
    );
  },
};
