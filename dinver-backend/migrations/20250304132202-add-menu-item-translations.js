'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First create the MenuItemTranslations table
    await queryInterface.createTable('MenuItemTranslations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      menuItemId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'MenuItems',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      language: {
        type: Sequelize.STRING(2),
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Add unique constraint for menuItemId + language combination
    await queryInterface.addConstraint('MenuItemTranslations', {
      fields: ['menuItemId', 'language'],
      type: 'unique',
      name: 'MenuItemTranslations_menuItemId_language_unique',
    });

    // Migrate existing data
    const menuItems = await queryInterface.sequelize.query(
      'SELECT id, name, description FROM "MenuItems"',
      { type: Sequelize.QueryTypes.SELECT },
    );

    for (const item of menuItems) {
      // Insert English translation
      await queryInterface.sequelize.query(
        `INSERT INTO "MenuItemTranslations" ("id", "menuItemId", "language", "name", "description", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), :menuItemId, 'en', :name, :description, NOW(), NOW())`,
        {
          replacements: {
            menuItemId: item.id,
            name: item.name,
            description: item.description,
          },
        },
      );

      // Insert Croatian translation (using same name and description for now)
      await queryInterface.sequelize.query(
        `INSERT INTO "MenuItemTranslations" ("id", "menuItemId", "language", "name", "description", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), :menuItemId, 'hr', :name, :description, NOW(), NOW())`,
        {
          replacements: {
            menuItemId: item.id,
            name: item.name,
            description: item.description,
          },
        },
      );
    }

    // Remove name and description columns from MenuItems
    await queryInterface.removeColumn('MenuItems', 'name');
    await queryInterface.removeColumn('MenuItems', 'description');
  },

  down: async (queryInterface, Sequelize) => {
    // Add back the columns to MenuItems
    await queryInterface.addColumn('MenuItems', 'name', {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn('MenuItems', 'description', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // Migrate data back (using English translations)
    const translations = await queryInterface.sequelize.query(
      'SELECT "menuItemId", "name", "description" FROM "MenuItemTranslations" WHERE "language" = \'en\'',
      { type: Sequelize.QueryTypes.SELECT },
    );

    for (const translation of translations) {
      await queryInterface.sequelize.query(
        `UPDATE "MenuItems" SET "name" = :name, "description" = :description WHERE "id" = :menuItemId`,
        {
          replacements: {
            menuItemId: translation.menuItemId,
            name: translation.name,
            description: translation.description,
          },
        },
      );
    }

    // Drop the MenuItemTranslations table
    await queryInterface.dropTable('MenuItemTranslations');
  },
};
