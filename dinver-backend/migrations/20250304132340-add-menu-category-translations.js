'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First create the MenuCategoryTranslations table
    await queryInterface.createTable('MenuCategoryTranslations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      menuCategoryId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'MenuCategories',
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
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Add unique constraint for menuCategoryId + language combination
    await queryInterface.addConstraint('MenuCategoryTranslations', {
      fields: ['menuCategoryId', 'language'],
      type: 'unique',
      name: 'MenuCategoryTranslations_menuCategoryId_language_unique',
    });

    // Migrate existing data
    const menuCategories = await queryInterface.sequelize.query(
      'SELECT id, name FROM "MenuCategories"',
      { type: Sequelize.QueryTypes.SELECT },
    );

    for (const category of menuCategories) {
      // Insert English translation
      await queryInterface.sequelize.query(
        `INSERT INTO "MenuCategoryTranslations" ("id", "menuCategoryId", "language", "name", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), :menuCategoryId, 'en', :name, NOW(), NOW())`,
        {
          replacements: {
            menuCategoryId: category.id,
            name: category.name,
          },
        },
      );

      // Insert Croatian translation (using same name for now)
      await queryInterface.sequelize.query(
        `INSERT INTO "MenuCategoryTranslations" ("id", "menuCategoryId", "language", "name", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), :menuCategoryId, 'hr', :name, NOW(), NOW())`,
        {
          replacements: {
            menuCategoryId: category.id,
            name: category.name,
          },
        },
      );
    }

    // Remove name column from MenuCategories
    await queryInterface.removeColumn('MenuCategories', 'name');
  },

  down: async (queryInterface, Sequelize) => {
    // Add back the name column to MenuCategories
    await queryInterface.addColumn('MenuCategories', 'name', {
      type: Sequelize.STRING,
      allowNull: false,
    });

    // Migrate data back (using English translations)
    const translations = await queryInterface.sequelize.query(
      'SELECT "menuCategoryId", "name" FROM "MenuCategoryTranslations" WHERE "language" = \'en\'',
      { type: Sequelize.QueryTypes.SELECT },
    );

    for (const translation of translations) {
      await queryInterface.sequelize.query(
        `UPDATE "MenuCategories" SET "name" = :name WHERE "id" = :menuCategoryId`,
        {
          replacements: {
            menuCategoryId: translation.menuCategoryId,
            name: translation.name,
          },
        },
      );
    }

    // Drop the MenuCategoryTranslations table
    await queryInterface.dropTable('MenuCategoryTranslations');
  },
};
