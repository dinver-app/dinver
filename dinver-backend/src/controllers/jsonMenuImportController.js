const fs = require('fs').promises;
const path = require('path');
const {
  MenuItem,
  MenuCategory,
  MenuItemTranslation,
  MenuCategoryTranslation,
  DrinkItem,
  DrinkCategory,
  DrinkItemTranslation,
  DrinkCategoryTranslation,
  Restaurant,
} = require('../../models');
const { autoTranslate } = require('../../utils/translate');
const { logAudit, ActionTypes, Entities } = require('../../utils/auditLogger');

// Import menu from JSON file for a specific restaurant
const importMenuFromJson = async (req, res) => {
  try {
    const { restaurantSlug } = req.params;
    const { menuType = 'food' } = req.body;

    // Find restaurant by slug
    const restaurant = await Restaurant.findOne({
      where: { slug: restaurantSlug },
    });

    if (!restaurant) {
      return res.status(404).json({
        error: `Restaurant with slug '${restaurantSlug}' not found`,
      });
    }

    // Path to the restaurant's menu folder
    const menuFolderPath = path.join(
      __dirname,
      '../../../data/menus',
      restaurantSlug,
    );

    try {
      await fs.access(menuFolderPath);
    } catch (error) {
      return res.status(404).json({
        error: `Menu folder for '${restaurantSlug}' not found at ${menuFolderPath}`,
      });
    }

    // Read all JSON files in the folder
    const files = await fs.readdir(menuFolderPath);
    const jsonFiles = files.filter((file) => file.endsWith('.json'));

    if (jsonFiles.length === 0) {
      return res.status(404).json({
        error: `No JSON files found in menu folder for '${restaurantSlug}'`,
      });
    }

    const results = {
      restaurant: restaurant.name,
      slug: restaurantSlug,
      menuType,
      files: [],
      categories: { created: 0, existing: 0 },
      items: { created: 0, errors: 0 },
      errors: [],
    };

    // Process each JSON file
    for (const jsonFile of jsonFiles) {
      try {
        const filePath = path.join(menuFolderPath, jsonFile);
        const fileContent = await fs.readFile(filePath, 'utf8');
        const menuData = JSON.parse(fileContent);

        const fileResult = {
          filename: jsonFile,
          categories: { created: 0, existing: 0 },
          items: { created: 0, errors: 0 },
          errors: [],
        };

        // Process categories first
        const categoryMap = new Map(); // categoryName -> categoryId

        if (menuData.categories && Array.isArray(menuData.categories)) {
          for (const categoryData of menuData.categories) {
            try {
              // Check if category already exists
              const existingCategory = await (
                menuType === 'food' ? MenuCategory : DrinkCategory
              ).findOne({
                where: { restaurantId: restaurant.id },
                include: [
                  {
                    model:
                      menuType === 'food'
                        ? MenuCategoryTranslation
                        : DrinkCategoryTranslation,
                    as: 'translations',
                    where: {
                      name: categoryData.name.hr,
                    },
                  },
                ],
              });

              if (existingCategory) {
                categoryMap.set(categoryData.name.hr, existingCategory.id);
                fileResult.categories.existing++;
                continue;
              }

              // Create new category
              const translations = [
                {
                  language: 'hr',
                  name: categoryData.name.hr,
                  description: categoryData.description?.hr || '',
                },
                {
                  language: 'en',
                  name: categoryData.name.en,
                  description: categoryData.description?.en || '',
                },
              ];

              const translatedData = await autoTranslate(translations);

              // Get last position
              const existingCategories = await (
                menuType === 'food' ? MenuCategory : DrinkCategory
              ).findAll({
                where: { restaurantId: restaurant.id },
                order: [['position', 'DESC']],
              });

              const lastPosition = existingCategories[0]?.position ?? -1;
              const newPosition = lastPosition + 1;

              const category = await (
                menuType === 'food' ? MenuCategory : DrinkCategory
              ).create({
                restaurantId: restaurant.id,
                position: newPosition,
                isActive: true,
              });

              // Create translations
              for (const translation of translatedData) {
                await (
                  menuType === 'food'
                    ? MenuCategoryTranslation
                    : DrinkCategoryTranslation
                ).create({
                  [menuType === 'food' ? 'menuCategoryId' : 'drinkCategoryId']:
                    category.id,
                  language: translation.language,
                  name: translation.name,
                  description: translation.description || null,
                });
              }

              categoryMap.set(categoryData.name.hr, category.id);
              fileResult.categories.created++;

              // Log audit
              await logAudit({
                userId: req.user ? req.user.id : null,
                action: ActionTypes.CREATE,
                entity:
                  menuType === 'food'
                    ? Entities.MENU_CATEGORY
                    : Entities.DRINK_CATEGORY,
                entityId: category.id,
                restaurantId: restaurant.id,
                changes: { new: { name: categoryData.name.hr } },
              });
            } catch (error) {
              console.error('Error processing category:', error);
              fileResult.errors.push(`Category error: ${error.message}`);
            }
          }
        }

        // Process items
        if (menuData.items && Array.isArray(menuData.items)) {
          for (const itemData of menuData.items) {
            try {
              // Get category ID
              const categoryId = categoryMap.get(itemData.categoryName);
              if (!categoryId) {
                fileResult.errors.push(
                  `Category not found for item: ${itemData.name.hr}`,
                );
                fileResult.items.errors++;
                continue;
              }

              // Check if item already exists
              const existingItem = await (
                menuType === 'food' ? MenuItem : DrinkItem
              ).findOne({
                where: {
                  restaurantId: restaurant.id,
                  categoryId,
                },
                include: [
                  {
                    model:
                      menuType === 'food'
                        ? MenuItemTranslation
                        : DrinkItemTranslation,
                    as: 'translations',
                    where: {
                      name: itemData.name.hr,
                    },
                  },
                ],
              });

              if (existingItem) {
                fileResult.items.errors++;
                fileResult.errors.push(
                  `Item already exists: ${itemData.name.hr}`,
                );
                continue;
              }

              // Create new item
              const translations = [
                {
                  language: 'hr',
                  name: itemData.name.hr,
                  description: itemData.description?.hr || '',
                },
                {
                  language: 'en',
                  name: itemData.name.en,
                  description: itemData.description?.en || '',
                },
              ];

              const translatedData = await autoTranslate(translations);

              // Get last position
              const existingItems = await (
                menuType === 'food' ? MenuItem : DrinkItem
              ).findAll({
                where: { restaurantId: restaurant.id },
                order: [['position', 'DESC']],
              });

              const lastPosition = existingItems[0]?.position ?? -1;
              const newPosition = lastPosition + 1;

              const item = await (
                menuType === 'food' ? MenuItem : DrinkItem
              ).create({
                price: itemData.price,
                restaurantId: restaurant.id,
                position: newPosition,
                categoryId,
                imageUrl: null,
                isActive: true,
                ...(menuType === 'food' && { allergens: [] }), // Only for food items
              });

              // Create translations
              for (const translation of translatedData) {
                await (
                  menuType === 'food'
                    ? MenuItemTranslation
                    : DrinkItemTranslation
                ).create({
                  [menuType === 'food' ? 'menuItemId' : 'drinkItemId']: item.id,
                  language: translation.language,
                  name: translation.name,
                  description: translation.description || '',
                });
              }

              fileResult.items.created++;

              // Log audit
              await logAudit({
                userId: req.user ? req.user.id : null,
                action: ActionTypes.CREATE,
                entity:
                  menuType === 'food'
                    ? Entities.MENU_ITEM
                    : Entities.DRINK_ITEM,
                entityId: item.id,
                restaurantId: restaurant.id,
                changes: {
                  new: { name: itemData.name.hr, price: itemData.price },
                },
              });
            } catch (error) {
              console.error('Error processing item:', error);
              fileResult.errors.push(`Item error: ${error.message}`);
              fileResult.items.errors++;
            }
          }
        }

        // Update totals
        results.categories.created += fileResult.categories.created;
        results.categories.existing += fileResult.categories.existing;
        results.items.created += fileResult.items.created;
        results.items.errors += fileResult.items.errors;
        results.errors.push(...fileResult.errors);

        results.files.push(fileResult);
      } catch (error) {
        console.error(`Error processing file ${jsonFile}:`, error);
        results.files.push({
          filename: jsonFile,
          error: error.message,
          categories: { created: 0, existing: 0 },
          items: { created: 0, errors: 0 },
          errors: [error.message],
        });
      }
    }

    res.json({
      success: true,
      message: `Menu import completed for ${restaurant.name}`,
      results,
    });
  } catch (error) {
    console.error('Error importing menu from JSON:', error);
    res.status(500).json({
      error: 'Failed to import menu from JSON',
      details: error.message,
    });
  }
};

// List available menu folders
const listAvailableMenus = async (req, res) => {
  try {
    const menusPath = path.join(__dirname, '../../../data/menus');

    try {
      await fs.access(menusPath);
    } catch (error) {
      return res.json({
        success: true,
        message: 'No menus folder found',
        menus: [],
      });
    }

    const folders = await fs.readdir(menusPath, { withFileTypes: true });
    const menuFolders = folders
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    const menus = [];

    for (const folder of menuFolders) {
      try {
        const folderPath = path.join(menusPath, folder);
        const files = await fs.readdir(folderPath);
        const jsonFiles = files.filter((file) => file.endsWith('.json'));

        // Check if restaurant exists in database
        const restaurant = await Restaurant.findOne({
          where: { slug: folder },
        });

        menus.push({
          slug: folder,
          restaurantName: restaurant ? restaurant.name : 'Unknown Restaurant',
          restaurantId: restaurant ? restaurant.id : null,
          jsonFiles: jsonFiles,
          fileCount: jsonFiles.length,
        });
      } catch (error) {
        console.error(`Error reading folder ${folder}:`, error);
        menus.push({
          slug: folder,
          restaurantName: 'Error reading folder',
          restaurantId: null,
          jsonFiles: [],
          fileCount: 0,
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: 'Available menus retrieved successfully',
      menus,
    });
  } catch (error) {
    console.error('Error listing available menus:', error);
    res.status(500).json({
      error: 'Failed to list available menus',
      details: error.message,
    });
  }
};

module.exports = {
  importMenuFromJson,
  listAvailableMenus,
};
