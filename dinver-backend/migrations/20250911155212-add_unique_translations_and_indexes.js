'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Unique constraints for translations (one translation per language per item)
    await queryInterface.addIndex(
      'MenuItemTranslations',
      ['menuItemId', 'language'],
      {
        name: 'ux_menu_item_translations_item_lang',
        unique: true,
      },
    );
    await queryInterface.addIndex(
      'DrinkItemTranslations',
      ['drinkItemId', 'language'],
      {
        name: 'ux_drink_item_translations_item_lang',
        unique: true,
      },
    );

    // Helpful indexes
    await queryInterface.addIndex('MenuItemTranslations', ['menuItemId'], {
      name: 'ix_menu_item_translations_menu_item_id',
    });
    await queryInterface.addIndex('DrinkItemTranslations', ['drinkItemId'], {
      name: 'ix_drink_item_translations_drink_item_id',
    });

    // Expression index for case-insensitive name search (Postgres)
    // Using literal to create LOWER(name) index
    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS ix_menu_item_translations_lower_name ON "MenuItemTranslations" (LOWER("name"));',
    );
    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS ix_drink_item_translations_lower_name ON "DrinkItemTranslations" (LOWER("name"));',
    );

    // Restaurant-scoped access
    await queryInterface.addIndex('MenuItems', ['restaurantId'], {
      name: 'ix_menu_items_restaurant_id',
    });
    await queryInterface.addIndex('DrinkItems', ['restaurantId'], {
      name: 'ix_drink_items_restaurant_id',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      'MenuItemTranslations',
      'ux_menu_item_translations_item_lang',
    );
    await queryInterface.removeIndex(
      'DrinkItemTranslations',
      'ux_drink_item_translations_item_lang',
    );
    await queryInterface.removeIndex(
      'MenuItemTranslations',
      'ix_menu_item_translations_menu_item_id',
    );
    await queryInterface.removeIndex(
      'DrinkItemTranslations',
      'ix_drink_item_translations_drink_item_id',
    );
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS ix_menu_item_translations_lower_name;',
    );
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS ix_drink_item_translations_lower_name;',
    );
    await queryInterface.removeIndex(
      'MenuItems',
      'ix_menu_items_restaurant_id',
    );
    await queryInterface.removeIndex(
      'DrinkItems',
      'ix_drink_items_restaurant_id',
    );
  },
};
