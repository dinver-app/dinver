'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Ensure/Detect pg_trgm availability (skip if not allowed)
    let hasTrgm = false;
    try {
      const [rows] = await queryInterface.sequelize.query(
        "SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm' LIMIT 1;",
      );
      hasTrgm = Array.isArray(rows) && rows.length > 0;
    } catch (_) {
      // ignore
    }
    if (!hasTrgm) {
      try {
        await queryInterface.sequelize.query(
          'CREATE EXTENSION IF NOT EXISTS pg_trgm;',
        );
        hasTrgm = true;
      } catch (e) {
        // No privileges to create extension — proceed without trigram indexes
        // They can be added later once the extension is enabled by a DBA.
      }
    }

    // Trigram indexes for fuzzy search on translations (only if pg_trgm present)
    if (hasTrgm) {
      await queryInterface.sequelize.query(
        'CREATE INDEX IF NOT EXISTS idx_menu_item_translations_name_trgm ON "MenuItemTranslations" USING gin ((lower(name)) gin_trgm_ops);',
      );
      await queryInterface.sequelize.query(
        'CREATE INDEX IF NOT EXISTS idx_drink_item_translations_name_trgm ON "DrinkItemTranslations" USING gin ((lower(name)) gin_trgm_ops);',
      );
    }

    // Array overlap indexes for perks and filters
    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS idx_restaurants_establishment_perks_gin ON "Restaurants" USING gin ("establishmentPerks");',
    );
    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS idx_restaurants_food_types_gin ON "Restaurants" USING gin ("foodTypes");',
    );
    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS idx_restaurants_meal_types_gin ON "Restaurants" USING gin ("mealTypes");',
    );
    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS idx_restaurants_dietary_types_gin ON "Restaurants" USING gin ("dietaryTypes");',
    );

    // Basic btree for frequent filters
    await queryInterface.addIndex('Restaurants', ['isClaimed'], {
      name: 'idx_restaurants_is_claimed',
    });
    await queryInterface.addIndex(
      'Restaurants',
      ['isClaimed', 'latitude', 'longitude'],
      { name: 'idx_restaurants_isclaimed_lat_lon' },
    );
    await queryInterface.addIndex('MenuItems', ['restaurantId', 'isActive'], {
      name: 'idx_menu_items_restaurant_active',
    });
    await queryInterface.addIndex('DrinkItems', ['restaurantId', 'isActive'], {
      name: 'idx_drink_items_restaurant_active',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      'DrinkItems',
      'idx_drink_items_restaurant_active',
    );
    await queryInterface.removeIndex(
      'MenuItems',
      'idx_menu_items_restaurant_active',
    );
    await queryInterface.removeIndex(
      'Restaurants',
      'idx_restaurants_isclaimed_lat_lon',
    );
    await queryInterface.removeIndex(
      'Restaurants',
      'idx_restaurants_is_claimed',
    );
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS idx_restaurants_dietary_types_gin;',
    );
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS idx_restaurants_meal_types_gin;',
    );
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS idx_restaurants_food_types_gin;',
    );
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS idx_restaurants_establishment_perks_gin;',
    );
    // Drop trigram indexes if they exist (regardless of extension state)
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS idx_drink_item_translations_name_trgm;',
    );
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS idx_menu_item_translations_name_trgm;',
    );
    // Do not drop extension globally
  },
};
