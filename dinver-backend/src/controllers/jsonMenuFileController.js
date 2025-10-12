const {
  JsonMenuFile,
  Restaurant,
  MenuItem,
  MenuCategory,
  MenuItemTranslation,
  MenuCategoryTranslation,
  DrinkItem,
  DrinkCategory,
  DrinkItemTranslation,
  DrinkCategoryTranslation,
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

// Get all JSON menu files for a restaurant
const getRestaurantJsonFiles = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const files = await JsonMenuFile.findAll({
      where: {
        restaurantId,
        isActive: true,
      },
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'slug'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      files,
    });
  } catch (error) {
    console.error('Error fetching JSON menu files:', error);
    res.status(500).json({
      error: 'Failed to fetch JSON menu files',
      details: error.message,
    });
  }
};

// Create a new JSON menu file
const createJsonMenuFile = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { filename, jsonContent, menuType } = req.body;

    // Validate JSON content
    if (!jsonContent || typeof jsonContent !== 'object') {
      return res.status(400).json({
        error: 'Invalid JSON content',
      });
    }

    // Check if file with same name already exists
    const existingFile = await JsonMenuFile.findOne({
      where: {
        restaurantId,
        filename,
        isActive: true,
      },
    });

    if (existingFile) {
      return res.status(400).json({
        error: 'File with this name already exists',
      });
    }

    const file = await JsonMenuFile.create({
      restaurantId,
      filename,
      jsonContent,
      menuType: menuType || 'food',
    });

    res.json({
      success: true,
      file,
    });
  } catch (error) {
    console.error('Error creating JSON menu file:', error);
    res.status(500).json({
      error: 'Failed to create JSON menu file',
      details: error.message,
    });
  }
};

// Update a JSON menu file
const updateJsonMenuFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { filename, jsonContent, menuType, isActive } = req.body;

    const file = await JsonMenuFile.findByPk(id);
    if (!file) {
      return res.status(404).json({
        error: 'File not found',
      });
    }

    // Validate JSON content if provided
    if (jsonContent && typeof jsonContent !== 'object') {
      return res.status(400).json({
        error: 'Invalid JSON content',
      });
    }

    await file.update({
      filename: filename || file.filename,
      jsonContent: jsonContent || file.jsonContent,
      menuType: menuType || file.menuType,
      isActive: isActive !== undefined ? isActive : file.isActive,
    });

    res.json({
      success: true,
      file,
    });
  } catch (error) {
    console.error('Error updating JSON menu file:', error);
    res.status(500).json({
      error: 'Failed to update JSON menu file',
      details: error.message,
    });
  }
};

// Delete a JSON menu file (soft delete)
const deleteJsonMenuFile = async (req, res) => {
  try {
    const { id } = req.params;

    const file = await JsonMenuFile.findByPk(id);
    if (!file) {
      return res.status(404).json({
        error: 'File not found',
      });
    }

    await file.update({ isActive: false });

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting JSON menu file:', error);
    res.status(500).json({
      error: 'Failed to delete JSON menu file',
      details: error.message,
    });
  }
};

// Import menu from JSON file
const importMenuFromJsonFile = async (req, res) => {
  try {
    const { id } = req.params;

    const file = await JsonMenuFile.findByPk(id, {
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'slug'],
        },
      ],
    });

    if (!file) {
      return res.status(404).json({
        error: 'File not found',
      });
    }

    if (!file.isActive) {
      return res.status(400).json({
        error: 'File is not active',
      });
    }

    const { jsonContent, menuType, restaurant } = file;
    const results = {
      restaurant: restaurant.name,
      slug: restaurant.slug,
      menuType,
      categories: { created: 0, existing: 0 },
      items: { created: 0, errors: 0 },
      sizes: { created: 0, existing: 0 },
      errors: [],
    };

    // Process categories first
    const categoryMap = new Map(); // categoryName -> categoryId

    if (jsonContent.categories && Array.isArray(jsonContent.categories)) {
      for (const categoryData of jsonContent.categories) {
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
            results.categories.existing++;
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
          results.categories.created++;

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
          results.errors.push(`Category error: ${error.message}`);
        }
      }
    }

    // Pre-process sizes: collect all unique size names and create them
    const uniqueSizeNames = new Set();
    if (jsonContent.items && Array.isArray(jsonContent.items)) {
      for (const itemData of jsonContent.items) {
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
        results.sizes.created++;
      } else {
        results.sizes.existing++;
      }
    }

    console.log('Size map created:', sizeMap);

    // Process items
    if (jsonContent.items && Array.isArray(jsonContent.items)) {
      for (const itemData of jsonContent.items) {
        try {
          // Get category ID
          const categoryId = categoryMap.get(itemData.categoryName);
          if (!categoryId) {
            results.errors.push(
              `Category not found for item: ${itemData.name.hr}`,
            );
            results.items.errors++;
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
            results.items.errors++;
            results.errors.push(`Item already exists: ${itemData.name.hr}`);
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
                results.errors.push(
                  `Invalid size data for item: ${itemData.name.hr} - size: ${JSON.stringify(size)}`,
                );
                hasInvalidSize = true;
                break;
              }
            }

            if (hasInvalidSize) {
              results.items.errors++;
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
              menuType === 'food' ? MenuItemTranslation : DrinkItemTranslation
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
                results.errors.push(
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
                results.errors.push(
                  `Size linking error for item ${itemData.name.hr}: ${error.message}`,
                );
              }
            }
          } else {
            console.log(`Item ${itemData.name.hr} has no sizes`);
          }

          results.items.created++;

          // Log audit
          await logAudit({
            userId: req.user ? req.user.id : null,
            action: ActionTypes.CREATE,
            entity:
              menuType === 'food' ? Entities.MENU_ITEM : Entities.DRINK_ITEM,
            entityId: item.id,
            restaurantId: restaurant.id,
            changes: { new: { name: itemData.name.hr, price: itemData.price } },
          });
        } catch (error) {
          console.error('Error processing item:', error);
          results.errors.push(`Item error: ${error.message}`);
          results.items.errors++;
        }
      }
    }

    res.json({
      success: true,
      message: `Menu import completed for ${restaurant.name}`,
      results,
    });
  } catch (error) {
    console.error('Error importing menu from JSON file:', error);
    res.status(500).json({
      error: 'Failed to import menu from JSON file',
      details: error.message,
    });
  }
};

module.exports = {
  getRestaurantJsonFiles,
  createJsonMenuFile,
  updateJsonMenuFile,
  deleteJsonMenuFile,
  importMenuFromJsonFile,
};
