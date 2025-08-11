const OpenAI = require('openai');
const sharp = require('sharp');
const {
  MenuItem,
  MenuCategory,
  MenuItemTranslation,
  MenuCategoryTranslation,
  DrinkItem,
  DrinkCategory,
  DrinkItemTranslation,
  DrinkCategoryTranslation,
} = require('../../models');
const { autoTranslate } = require('../../utils/translate');
const { logAudit, ActionTypes, Entities } = require('../../utils/auditLogger');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Utility: per-operation timeout wrapper
const withTimeout = (promise, ms, label = 'operation') =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });

// Function to analyze menu image with GPT Vision
// options: { accuracy?: boolean }
const analyzeMenuImageWithGPT = async (
  imageBuffer,
  menuType = 'food',
  options = {},
) => {
  const { accuracy = false } = options;
  try {
    // Optimize image with sharp before processing
    let optimizedBuffer;
    if (imageBuffer.buffer) {
      optimizedBuffer = await sharp(imageBuffer.buffer)
        .resize(accuracy ? 1024 : 768, accuracy ? 1024 : 768, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: accuracy ? 80 : 70 })
        .toBuffer();
    } else {
      optimizedBuffer = await sharp(imageBuffer)
        .resize(accuracy ? 1024 : 768, accuracy ? 1024 : 768, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: accuracy ? 80 : 70 })
        .toBuffer();
    }

    // Convert optimized image to base64
    const base64Image = optimizedBuffer.toString('base64');

    // Use JPEG as optimized format
    const mimeType = 'image/jpeg';

    // Ensure the image is properly formatted for OpenAI
    const imageData = {
      url: `data:image/jpeg;base64,${base64Image}`,
      detail: 'high',
    };

    const prompt =
      menuType === 'food'
        ? `Analyze this menu image and extract all menu categories and items. For each category, provide the name in Croatian (hr) and English (en). For each menu item, provide the name in Croatian (hr) and English (en), description in both languages, price (as a number), and the category name it belongs to. If an item has different sizes with different prices, include them in the sizes array. Ignore allergens for food items.

IMPORTANT FORMATTING RULES:
- Remove all parentheses () from descriptions
- Standardize descriptions to be clean and simple
- If you see ingredients in parentheses like "(salama, sir)", just write "salama, sir" without parentheses
- Keep descriptions concise and consistent
- Avoid special characters or formatting in descriptions
- Use consistent ingredient separators (commas, not semicolons or other characters)
- If you see multiple ingredients, separate them with commas: "salama, sir, pečurke"
- Remove any extra spaces or formatting
- Keep descriptions under 100 characters when possible
- For categories, use simple, clear names without extra formatting or special characters
- Keep category names short and descriptive (e.g., "Glavna jela", "Predjela", "Deserti" for food)
- Maintain consistent capitalization: if text appears in ALL CAPS on the menu, keep it in ALL CAPS; if it's in normal case, keep it in normal case
- For food items: Use hasSizes, defaultSizeName, and sizes fields when multiple sizes are available for the same item

CRITICAL: For food items, use hasSizes: true and populate sizes array when you see multiple size options for the same item (e.g., "Mala", "Velika" for pizza).

DATA INTEGRITY RULES:
- Do NOT fabricate or infer descriptions. Only include description text that is explicitly visible on the menu image. If no description is present, set description.hr and description.en to empty strings "".
- Be exhaustive. Do not skip categories or items; include every visible item and price you can read from the image.
- Do not merge different items. Treat each unique line/item on the menu as a separate item unless it is an exact duplicate.
- Keep the Croatian (hr) names exactly as they appear on the menu (same spelling/capitalization, including diacritics). Provide English (en) as a translation, but do not change the hr text.

Return the data in this exact JSON format:
{
  "categories": [
    {
      "name": {"hr": "Category name in Croatian", "en": "Category name in English"},
      "description": {"hr": "Category description in Croatian", "en": "Category description in English"}
    }
  ],
  "items": [
    {
      "name": {"hr": "Item name in Croatian", "en": "Item name in English"},
      "description": {"hr": "Item description in Croatian", "en": "Item description in English"},
      "price": 15.50,
      "categoryName": "Category name in Croatian",
      "hasSizes": false,
      "defaultSizeName": null,
      "sizes": []
    }
  ]
}

Examples:
- For food: "Pizza Margherita" with "Mala" and "Velika" sizes should be ONE item with hasSizes: true and sizes array
- For categories: "Glavna jela", "Predjela", "Deserti", "Pizza", "Pasta"
`
        : `Analyze this drink menu image and extract all drink categories and items. For each category, provide the name in Croatian (hr) and English (en). For each drink item, provide the name in Croatian (hr) and English (en), description in both languages, price (as a number), and the category name it belongs to.

IMPORTANT FORMATTING RULES:
- Remove all parentheses () from descriptions
- Standardize descriptions to be clean and simple
- If you see ingredients in parentheses like "(salama, sir)", just write "salama, sir" without parentheses
- Keep descriptions concise and consistent
- Avoid special characters or formatting in descriptions
- For drinks, if you see size information (like 0,75l, 0.5l, 330ml, etc.) that is separate from the name, include it in the item name. For example: "Mineralna voda 0,75l" instead of separate name and size
- If size is clearly part of the item name, keep it as is
- For categories, use simple, clear names without extra formatting or special characters
- Keep category names short and descriptive (e.g., "Pića", "Alkoholna pića", "Bezalkoholna pića" for drinks)
- Maintain consistent capitalization: if text appears in ALL CAPS on the menu, keep it in ALL CAPS; if it's in normal case, keep it in normal case
- For drink items: NEVER use hasSizes, defaultSizeName, or sizes fields. Always include size information in the item name (e.g., "Jana 0,33l", "Jana 0,75l" as separate items)
- For food items: Use hasSizes, defaultSizeName, and sizes fields when multiple sizes are available for the same item

CRITICAL: For drink items, always set hasSizes: false, defaultSizeName: null, and sizes: [] regardless of what you see on the menu. Size information should be included in the item name instead.

Examples:
- If you see "Mineralna voda" and separately "0,75l" → use "Mineralna voda 0,75l"
- If you see "Coca Cola 0,5l" → keep as "Coca Cola 0,5l"

Category examples:
- For drinks: "Pića", "Alkoholna pića", "Bezalkoholna pića", "Kava", "Čaj"
- For food: "Glavna jela", "Predjela", "Deserti", "Pizza", "Pasta"

Drink vs Food examples:
- For drinks: "Jana 0,33l" and "Jana 0,75l" should be TWO SEPARATE items (not one item with sizes)
- For food: "Pizza Margherita" with "Mala" and "Velika" sizes should be ONE item with hasSizes: true and sizes array

DATA INTEGRITY RULES:
- Do NOT fabricate or infer descriptions. Only include description text that is explicitly visible on the menu image. If no description is present, set description.hr and description.en to empty strings "".
- Be exhaustive. Do not skip categories or items; include every visible item and price you can read from the image.
- Do not merge different items. Treat each unique line/item on the menu as a separate item unless it is an exact duplicate.
- Keep the Croatian (hr) names exactly as they appear on the menu (same spelling/capitalization, including diacritics). Provide English (en) as a translation, but do not change the hr text.

Return the data in this exact JSON format:
{
  "categories": [
    {
      "name": {"hr": "Category name in Croatian", "en": "Category name in English"},
      "description": {"hr": "Category description in Croatian", "en": "Category description in English"}
    }
  ],
  "items": [
    {
      "name": {"hr": "Item name in Croatian", "en": "Item name in English"},
      "description": {"hr": "Item description in Croatian", "en": "Item description in English"},
      "price": 15.50,
      "categoryName": "Category name in Croatian",
      "hasSizes": false,
      "defaultSizeName": null,
      "sizes": []
    }
  ]
}

Examples:
- For drinks: "Jana 0,33l" and "Jana 0,75l" should be TWO SEPARATE items (not one item with sizes)
- For categories: "Pića", "Alkoholna pića", "Bezalkoholna pića", "Kava", "Čaj"
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: accuracy ? 'high' : 'low',
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    // Prefer strict JSON parsing (response_format: json_object). Fallback to regex extraction.
    let menuData;
    try {
      menuData = JSON.parse(content);
    } catch (_) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in OpenAI response');
      }
      menuData = JSON.parse(jsonMatch[0]);
    }

    // Validate the structure
    if (!menuData.categories || !menuData.items) {
      throw new Error('Invalid menu data structure from OpenAI');
    }

    return menuData;
  } catch (openaiError) {
    console.error('OpenAI API error details:', {
      code: openaiError.code,
      message: openaiError.message,
      param: openaiError.param,
      type: openaiError.type,
    });
    throw openaiError;
  }
};

// Analyze menu from single image
const analyzeMenuImage = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { menuType = 'food', accuracy = false } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Validate image format
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (!allowedMimeTypes.includes(imageFile.mimetype)) {
      return res.status(400).json({
        error:
          'Unsupported image format. Please use JPEG, PNG, GIF, or WebP format.',
      });
    }

    const menuData = await withTimeout(
      analyzeMenuImageWithGPT(imageFile, menuType, { accuracy }),
      accuracy ? 35000 : 25000,
      'OpenAI menu analysis',
    );

    // Fetch existing categories and items for dedupe/selection aid
    const [existingCategories, existingItems] = await Promise.all([
      (menuType === 'food' ? MenuCategory : DrinkCategory).findAll({
        where: { restaurantId },
        include: [
          {
            model:
              menuType === 'food'
                ? MenuCategoryTranslation
                : DrinkCategoryTranslation,
            as: 'translations',
          },
        ],
        order: [['position', 'ASC']],
      }),
      (menuType === 'food' ? MenuItem : DrinkItem).findAll({
        where: { restaurantId },
        include: [
          {
            model:
              menuType === 'food' ? MenuItemTranslation : DrinkItemTranslation,
            as: 'translations',
          },
        ],
        order: [['position', 'ASC']],
      }),
    ]);

    // Shape lightweight existing data for the client
    const existing = {
      categories: existingCategories.map((c) => ({
        id: c.id,
        position: c.position,
        isActive: c.isActive,
        name: c.translations.find((t) => t.language === 'hr')?.name || '',
        translations: c.translations.map((t) => ({
          language: t.language,
          name: t.name,
          description: t.description || '',
        })),
      })),
      items: existingItems.map((i) => ({
        id: i.id,
        categoryId: i.categoryId,
        position: i.position,
        isActive: i.isActive,
        price: i.price,
        hasSizes: i.hasSizes,
        defaultSizeName: i.defaultSizeName,
        sizes: i.sizes,
        name: i.translations.find((t) => t.language === 'hr')?.name || '',
        translations: i.translations.map((t) => ({
          language: t.language,
          name: t.name,
          description: t.description || '',
        })),
      })),
    };

    res.json({
      success: true,
      message: 'Menu analyzed successfully',
      data: menuData,
      existing,
      restaurantId,
      menuType,
      accuracy,
    });
  } catch (error) {
    console.error('Error analyzing menu image:', error);
    res.status(500).json({
      error: 'Failed to analyze menu image',
      details: error.message,
    });
  }
};

// Analyze menu from multiple images
const analyzeMultipleMenuImages = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { menuType = 'food' } = req.body;
    const imageFiles = req.files;

    if (!imageFiles || imageFiles.length === 0) {
      return res.status(400).json({ error: 'No image files provided' });
    }

    // Validate image formats
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    for (const file of imageFiles) {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({
          error: `Unsupported image format: ${file.originalname}. Please use JPEG, PNG, GIF, or WebP format.`,
        });
      }
    }

    const results = [];
    let combinedMenuData = {
      categories: [],
      items: [],
    };

    // Process images in parallel with per-image timeouts to fit within platform limits
    const perImageTimeoutMs = 25000;
    const tasks = imageFiles.map((file) =>
      withTimeout(
        analyzeMenuImageWithGPT(file, menuType),
        perImageTimeoutMs,
        `OpenAI analysis for ${file.originalname}`,
      )
        .then((menuData) => ({ status: 'fulfilled', file, menuData }))
        .catch((error) => ({ status: 'rejected', file, error })),
    );

    const settled = await Promise.all(tasks);

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        const { file, menuData } = result;
        combinedMenuData.categories = [
          ...combinedMenuData.categories,
          ...menuData.categories,
        ];
        combinedMenuData.items = [...combinedMenuData.items, ...menuData.items];
        results.push({ filename: file.originalname, data: menuData });
      } else {
        const { file, error } = result;
        console.error(`Error processing file ${file.originalname}:`, error);
        results.push({ filename: file.originalname, error: error.message });
      }
    }

    // Remove duplicates based on name
    const uniqueCategories = [];
    const seenCategories = new Set();

    for (const category of combinedMenuData.categories) {
      const key = category.name.hr;
      if (!seenCategories.has(key)) {
        seenCategories.add(key);
        uniqueCategories.push(category);
      }
    }

    const uniqueItems = [];
    const seenItems = new Set();

    for (const item of combinedMenuData.items) {
      const key = `${item.name.hr}-${item.categoryName}`;
      if (!seenItems.has(key)) {
        seenItems.add(key);
        uniqueItems.push(item);
      }
    }

    res.json({
      success: true,
      message: 'Menu analyzed successfully',
      data: {
        categories: uniqueCategories,
        items: uniqueItems,
      },
      results,
      restaurantId,
      menuType,
    });
  } catch (error) {
    console.error('Error analyzing multiple menu images:', error);
    res.status(500).json({
      error: 'Failed to analyze menu images',
      details: error.message,
    });
  }
};

// Import edited menu data to system
const importEditedMenu = async (req, res) => {
  try {
    const { restaurantId, menuType, categories, items } = req.body;

    if (!restaurantId || !categories || !items) {
      return res.status(400).json({ error: 'Missing required data' });
    }

    const results = {
      categories: { created: 0, existing: 0 },
      items: { created: 0, errors: 0 },
      errors: [],
    };

    // Process categories first
    const categoryMap = new Map(); // categoryName -> categoryId

    for (const categoryData of categories) {
      try {
        // Check if category already exists
        const existingCategory = await (
          menuType === 'food' ? MenuCategory : DrinkCategory
        ).findOne({
          where: { restaurantId },
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
          where: { restaurantId },
          order: [['position', 'DESC']],
        });

        const lastPosition = existingCategories[0]?.position ?? -1;
        const newPosition = lastPosition + 1;

        const category = await (
          menuType === 'food' ? MenuCategory : DrinkCategory
        ).create({
          restaurantId,
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
          restaurantId: restaurantId,
          changes: { new: { name: categoryData.name.hr } },
        });
      } catch (error) {
        console.error('Error processing category:', error);
        results.errors.push(`Category error: ${error.message}`);
      }
    }

    // Process items
    for (const itemData of items) {
      try {
        // Prefer an explicit categoryId if supplied by the client to keep selections stable
        const categoryId =
          itemData.categoryId || categoryMap.get(itemData.categoryName);
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
            restaurantId,
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
          where: { restaurantId },
          order: [['position', 'DESC']],
        });

        const lastPosition = existingItems[0]?.position ?? -1;
        const newPosition = lastPosition + 1;

        const item = await (menuType === 'food' ? MenuItem : DrinkItem).create({
          price: itemData.price,
          restaurantId,
          position: newPosition,
          categoryId,
          imageUrl: null,
          isActive: true,
          hasSizes: itemData.hasSizes || false,
          defaultSizeName: itemData.defaultSizeName || null,
          sizes: itemData.sizes || [],
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

        results.items.created++;

        // Log audit
        await logAudit({
          userId: req.user ? req.user.id : null,
          action: ActionTypes.CREATE,
          entity:
            menuType === 'food' ? Entities.MENU_ITEM : Entities.DRINK_ITEM,
          entityId: item.id,
          restaurantId: restaurantId,
          changes: { new: { name: itemData.name.hr, price: itemData.price } },
        });
      } catch (error) {
        console.error('Error processing item:', error);
        results.errors.push(`Item error: ${error.message}`);
        results.items.errors++;
      }
    }

    res.json({
      success: true,
      message: 'Menu imported successfully',
      results,
    });
  } catch (error) {
    console.error('Error importing edited menu:', error);
    res.status(500).json({
      error: 'Failed to import menu',
      details: error.message,
    });
  }
};

module.exports = {
  analyzeMenuImage,
  analyzeMultipleMenuImages,
  importEditedMenu,
};
