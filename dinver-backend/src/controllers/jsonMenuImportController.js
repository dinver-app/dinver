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
  Size,
  SizeTranslation,
  MenuItemSize,
} = require('../../models');
const { autoTranslate } = require('../../utils/translate');
const { logAudit, ActionTypes, Entities } = require('../../utils/auditLogger');
const { Sequelize } = require('sequelize');

// Helper function to find or create a size for a restaurant
const findOrCreateSize = async (restaurantId, sizeName) => {
  // Try to find existing (case-insensitive)
  const existingSize = await Size.findOne({
    where: { restaurantId },
    include: [
      {
        model: SizeTranslation,
        as: 'translations',
        where: Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('translations.name')),
          Sequelize.fn('LOWER', sizeName.trim()),
        ),
      },
    ],
  });

  if (existingSize) {
    console.log(`Found existing size: ${sizeName} (ID: ${existingSize.id})`);
    return { sizeId: existingSize.id, wasCreated: false };
  }

  // Create new size
  console.log(`Creating new size: ${sizeName}`);
  const translations = [
    { language: 'hr', name: sizeName },
    { language: 'en', name: sizeName },
  ];

  const translatedData = await autoTranslate(translations);
  const size = await Size.create({ restaurantId, isActive: true });

  for (const translation of translatedData) {
    await SizeTranslation.create({
      sizeId: size.id,
      language: translation.language,
      name: translation.name,
    });
  }

  console.log(`Created size: ${sizeName} (ID: ${size.id})`);
  return { sizeId: size.id, wasCreated: true };
};

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
      sizes: { created: 0, existing: 0 },
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
          sizes: { created: 0, existing: 0 },
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

        // Pre-process sizes: collect all unique size names and create them
        const uniqueSizeNames = new Set();
        if (menuData.items && Array.isArray(menuData.items)) {
          for (const itemData of menuData.items) {
            if (itemData.sizes && Array.isArray(itemData.sizes)) {
              for (const size of itemData.sizes) {
                if (size.name) {
                  uniqueSizeNames.add(size.name.trim());
                }
              }
            }
          }
        }

        console.log(
          `Found ${uniqueSizeNames.size} unique sizes:`,
          Array.from(uniqueSizeNames),
        );

        // Create/find all sizes and build a map
        const sizeMap = {}; // { "Normal": "uuid-123", "Jumbo": "uuid-456" }
        for (const sizeName of uniqueSizeNames) {
          const { sizeId, wasCreated } = await findOrCreateSize(
            restaurant.id,
            sizeName,
          );
          sizeMap[sizeName] = sizeId;

          if (wasCreated) {
            fileResult.sizes.created++;
          } else {
            fileResult.sizes.existing++;
          }
        }

        console.log('Size map created:', sizeMap);

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

              // Determine if item has sizes
              const hasSizes =
                itemData.sizes &&
                Array.isArray(itemData.sizes) &&
                itemData.sizes.length > 0;

              console.log(
                `Item ${itemData.name.hr} has sizes:`,
                hasSizes,
                itemData.sizes,
              );

              // Validate sizes if provided
              if (hasSizes) {
                // Ensure at least one size has isDefault: true
                const hasDefault = itemData.sizes.some(
                  (size) => size.isDefault === true,
                );
                if (!hasDefault) {
                  // Make first size default
                  itemData.sizes[0].isDefault = true;
                }

                // Validate all sizes before proceeding
                let hasInvalidSize = false;
                for (const size of itemData.sizes) {
                  if (
                    !size.name ||
                    typeof size.price !== 'number' ||
                    size.price < 0
                  ) {
                    fileResult.errors.push(
                      `Invalid size data for item: ${itemData.name.hr} - size: ${JSON.stringify(size)}`,
                    );
                    hasInvalidSize = true;
                    break;
                  }
                }

                if (hasInvalidSize) {
                  fileResult.items.errors++;
                  continue; // Skip this item entirely
                }
              }

              const item = await (
                menuType === 'food' ? MenuItem : DrinkItem
              ).create({
                price: hasSizes ? null : itemData.price, // Set to null if sizes exist
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

              // Link sizes using the pre-built map
              if (hasSizes) {
                console.log(
                  `Linking ${itemData.sizes.length} sizes for item ${itemData.name.hr}`,
                );
                for (let i = 0; i < itemData.sizes.length; i++) {
                  const sizeData = itemData.sizes[i];
                  const sizeId = sizeMap[sizeData.name.trim()]; // Get ID from map

                  if (!sizeId) {
                    fileResult.errors.push(
                      `Size ${sizeData.name} not found for item ${itemData.name.hr}`,
                    );
                    continue;
                  }

                  try {
                    await MenuItemSize.create({
                      menuItemId: item.id,
                      sizeId: sizeId, // Use the ID from map
                      price: Number(sizeData.price),
                      isDefault: sizeData.isDefault || false,
                      position: i,
                    });

                    console.log(
                      `Successfully linked size ${sizeData.name} (ID: ${sizeId}) to item ${itemData.name.hr}`,
                    );
                  } catch (error) {
                    console.error(
                      `Error linking size for item ${itemData.name.hr}:`,
                      error,
                    );
                    fileResult.errors.push(
                      `Size linking error for item ${itemData.name.hr}: ${error.message}`,
                    );
                  }
                }
              } else {
                console.log(`Item ${itemData.name.hr} has no sizes`);
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
        results.sizes.created += fileResult.sizes.created;
        results.sizes.existing += fileResult.sizes.existing;
        results.errors.push(...fileResult.errors);

        results.files.push(fileResult);
      } catch (error) {
        console.error(`Error processing file ${jsonFile}:`, error);
        results.files.push({
          filename: jsonFile,
          error: error.message,
          categories: { created: 0, existing: 0 },
          items: { created: 0, errors: 0 },
          sizes: { created: 0, existing: 0 },
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
