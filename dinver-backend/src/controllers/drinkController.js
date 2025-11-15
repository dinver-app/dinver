const {
  DrinkItem,
  DrinkCategory,
  DrinkItemTranslation,
  DrinkCategoryTranslation,
} = require('../../models');
const { uploadToS3, getBaseFileName, getFolderFromKey } = require('../../utils/s3Upload');
const { deleteFromS3 } = require('../../utils/s3Delete');
const { logAudit, ActionTypes, Entities } = require('../../utils/auditLogger');
const { autoTranslate } = require('../../utils/translate');
const { getMediaUrl, getMediaUrlVariants } = require('../../config/cdn');
const {
  uploadImage,
  getImageUrls,
  UPLOAD_STRATEGY,
} = require('../../services/imageUploadService');

// Helper function to get user language
const getUserLanguage = (req) => {
  return req.user?.language || 'hr';
};

// Get all drink items for a specific restaurant
const getDrinkItems = async (req, res) => {
  try {
    const restaurantId = req.restaurantId || req.params.restaurantId;
    const language = getUserLanguage(req);

    const drinkItems = await DrinkItem.findAll({
      where: {
        restaurantId,
        isActive: true, // Samo aktivne stavke
      },
      order: [['position', 'ASC']],
      include: [
        {
          model: DrinkItemTranslation,
          as: 'translations',
        },
        {
          model: DrinkCategory,
          as: 'category',
          include: [
            {
              model: DrinkCategoryTranslation,
              as: 'translations',
            },
          ],
        },
      ],
    });

    const formattedDrinkItems = drinkItems.map((item) => {
      const itemData = item.toJSON();
      const userTranslation = itemData.translations.find(
        (t) => t.language === language,
      );
      const anyTranslation = itemData.translations[0];

      // For list views, use thumbnail and include all variants
      const imageUrls = itemData.imageUrl ? getImageUrls(itemData.imageUrl) : null;

      return {
        ...itemData,
        name: (userTranslation || anyTranslation)?.name || '',
        description: (userTranslation || anyTranslation)?.description || '',
        price: parseFloat(itemData.price).toFixed(2),
        imageUrl: itemData.imageUrl
          ? getMediaUrl(itemData.imageUrl, 'image', 'thumbnail')
          : null,
        imageUrls: imageUrls,
      };
    });

    res.json(formattedDrinkItems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch drink items' });
  }
};

// Get all drink categories for a specific restaurant
const getDrinkCategories = async (req, res) => {
  try {
    const restaurantId = req.restaurantId || req.params.restaurantId;
    const language = getUserLanguage(req);

    const categories = await DrinkCategory.findAll({
      where: {
        restaurantId,
        isActive: true, // Samo aktivne kategorije
      },
      order: [['position', 'ASC']],
      include: [
        {
          model: DrinkCategoryTranslation,
          as: 'translations',
        },
      ],
    });

    const formattedCategories = categories.map((category) => {
      const categoryData = category.toJSON();
      const userTranslation = categoryData.translations.find(
        (t) => t.language === language,
      );
      const anyTranslation = categoryData.translations[0];

      return {
        ...categoryData,
        name: (userTranslation || anyTranslation)?.name || '',
      };
    });

    res.json(formattedCategories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch drink categories' });
  }
};

// Create a new drink item
const createDrinkItem = async (req, res) => {
  try {
    const translations = JSON.parse(req.body.translations || '[]');
    const translatedData = await autoTranslate(translations);
    const { price, restaurantId } = req.body;
    const categoryId =
      req.body.categoryId === 'null' ? null : req.body.categoryId;
    const file = req.file;
    const language = getUserLanguage(req);

    if (!translatedData || translatedData.length === 0) {
      return res
        .status(400)
        .json({ message: 'at_least_one_translation_required' });
    }

    // Get last position
    const existingItems = await DrinkItem.findAll({
      where: { restaurantId },
      order: [['position', 'DESC']],
    });

    const lastPosition = existingItems[0]?.position ?? -1;
    const newPosition = lastPosition + 1;

    // Handle image upload with new optimistic processing
    let imageKey = null;
    let imageUploadResult = null;
    if (file) {
      const folder = 'drink_items';
      try {
        imageUploadResult = await uploadImage(file, folder, {
          strategy: UPLOAD_STRATEGY.OPTIMISTIC,
          entityType: 'drink_item',
          entityId: null,
          priority: 10,
        });
        imageKey = imageUploadResult.imageUrl;
      } catch (uploadError) {
        console.error('Error uploading to S3:', uploadError);
        return res.status(500).json({ error: 'Failed to upload image' });
      }
    }

    // Create drink item
    const drinkItem = await DrinkItem.create({
      price,
      restaurantId,
      position: newPosition,
      imageUrl: imageKey,
      categoryId,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true, // Default to true if not provided
    });

    // Create translations
    for (const translation of translatedData) {
      await DrinkItemTranslation.create({
        drinkItemId: drinkItem.id,
        language: translation.language,
        name: translation.name,
        description: translation.description || '',
      });
    }

    // Fetch created item with translations
    const createdItem = await DrinkItem.findByPk(drinkItem.id, {
      include: [{ model: DrinkItemTranslation, as: 'translations' }],
    });

    const userTranslation = createdItem.translations.find(
      (t) => t.language === language,
    );
    const anyTranslation = createdItem.translations[0];

    // Prepare image URLs with variants
    let imageUrls = null;
    if (imageKey) {
      if (imageUploadResult && imageUploadResult.status === 'processing') {
        imageUrls = {
          thumbnail: imageUploadResult.urls.thumbnail,
          medium: imageUploadResult.urls.medium,
          fullscreen: imageUploadResult.urls.fullscreen,
          processing: true,
          jobId: imageUploadResult.jobId,
        };
      } else {
        imageUrls = getImageUrls(imageKey);
      }
    }

    const result = {
      ...createdItem.get(),
      name: (userTranslation || anyTranslation)?.name || '',
      description: (userTranslation || anyTranslation)?.description || '',
      imageUrl: imageKey ? getMediaUrl(imageKey, 'image', 'medium') : null,
      imageUrls: imageUrls,
    };

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating drink item:', error);
    res.status(500).json({ error: 'Failed to create drink item' });
  }
};

// Update an existing drink item
const updateDrinkItem = async (req, res) => {
  try {
    const { id } = req.params;
    const translations = JSON.parse(req.body.translations || '[]');
    const translatedData = await autoTranslate(translations);
    const price = req.body.price;
    const removeImage = req.body.removeImage;
    const categoryId =
      req.body.categoryId === 'null' ? null : req.body.categoryId;
    const file = req.file;
    const language = getUserLanguage(req);

    if (!translatedData || translatedData.length === 0) {
      return res
        .status(400)
        .json({ message: 'at_least_one_translation_required' });
    }

    const drinkItem = await DrinkItem.findByPk(id);
    if (!drinkItem) {
      return res.status(404).json({ message: 'Drink item not found' });
    }

    // Handle image
    let imageKey = drinkItem.imageUrl;
    let imageUploadResult = null;
    if (file) {
      // Delete old image variants before uploading new
      if (drinkItem.imageUrl) {
        const baseFileName = getBaseFileName(drinkItem.imageUrl);
        const folder = getFolderFromKey(drinkItem.imageUrl);
        const variants = ['thumb', 'medium', 'full'];
        for (const variant of variants) {
          const key = `${folder}/${baseFileName}-${variant}.jpg`;
          try {
            await deleteFromS3(key);
          } catch (error) {
            console.error(`Failed to delete ${key}:`, error);
          }
        }
      }
      const folder = 'drink_items';
      try {
        imageUploadResult = await uploadImage(file, folder, {
          strategy: UPLOAD_STRATEGY.OPTIMISTIC,
          entityType: 'drink_item',
          entityId: id,
          priority: 10,
        });
        imageKey = imageUploadResult.imageUrl;
      } catch (uploadError) {
        console.error('Error uploading to S3:', uploadError);
        return res.status(500).json({ error: 'Failed to upload image' });
      }
    } else if (removeImage === 'true') {
      if (drinkItem.imageUrl) {
        const baseFileName = getBaseFileName(drinkItem.imageUrl);
        const folder = getFolderFromKey(drinkItem.imageUrl);
        const variants = ['thumb', 'medium', 'full'];
        for (const variant of variants) {
          const key = `${folder}/${baseFileName}-${variant}.jpg`;
          try {
            await deleteFromS3(key);
          } catch (error) {
            console.error(`Failed to delete ${key}:`, error);
          }
        }
      }
      imageKey = null;
    }

    // Delete existing translations
    await DrinkItemTranslation.destroy({
      where: { drinkItemId: drinkItem.id },
    });

    // Create new translations
    for (const translation of translatedData) {
      await DrinkItemTranslation.create({
        drinkItemId: drinkItem.id,
        language: translation.language,
        name: translation.name,
        description: translation.description || '',
      });
    }

    // Update drink item
    await drinkItem.update({
      price: price !== undefined ? price : drinkItem.price,
      imageUrl: imageKey,
      categoryId: categoryId !== undefined ? categoryId : drinkItem.categoryId,
      isActive:
        req.body.isActive !== undefined
          ? req.body.isActive
          : drinkItem.isActive,
    });

    // Fetch updated item
    const updated = await DrinkItem.findByPk(id, {
      include: [{ model: DrinkItemTranslation, as: 'translations' }],
    });

    const userTranslation = updated.translations.find(
      (t) => t.language === language,
    );
    const anyTranslation = updated.translations[0];

    // Prepare image URLs with variants
    let imageUrls = null;
    if (imageKey) {
      if (imageUploadResult && imageUploadResult.status === 'processing') {
        imageUrls = {
          thumbnail: imageUploadResult.urls.thumbnail,
          medium: imageUploadResult.urls.medium,
          fullscreen: imageUploadResult.urls.fullscreen,
          processing: true,
          jobId: imageUploadResult.jobId,
        };
      } else {
        imageUrls = getImageUrls(imageKey);
      }
    }

    const result = {
      ...updated.get(),
      name: (userTranslation || anyTranslation)?.name || '',
      description: (userTranslation || anyTranslation)?.description || '',
      imageUrl: imageKey ? getMediaUrl(imageKey, 'image', 'medium') : null,
      imageUrls: imageUrls,
      translations: updated.translations,
    };

    res.json(result);
  } catch (error) {
    console.error('Error updating drink item:', error);
    res.status(500).json({ message: 'Failed to update drink item' });
  }
};

// Delete a drink item
const deleteDrinkItem = async (req, res) => {
  try {
    const { id } = req.params;
    const drinkItem = await DrinkItem.findByPk(id);
    if (!drinkItem) {
      return res.status(404).json({ error: 'Drink item not found' });
    }

    // Delete image variants from S3 if they exist
    if (drinkItem.imageUrl) {
      const baseFileName = getBaseFileName(drinkItem.imageUrl);
      const folder = getFolderFromKey(drinkItem.imageUrl);
      const variants = ['thumb', 'medium', 'full'];
      for (const variant of variants) {
        const key = `${folder}/${baseFileName}-${variant}.jpg`;
        try {
          await deleteFromS3(key);
        } catch (error) {
          console.error(`Failed to delete ${key}:`, error);
        }
      }
    }

    await logAudit({
      userId: req.user ? req.user.id : null,
      action: ActionTypes.DELETE,
      entity: Entities.DRINK_ITEM,
      entityId: drinkItem.id,
      restaurantId: drinkItem.restaurantId,
      changes: { old: drinkItem.get() },
    });

    await drinkItem.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete drink item' });
  }
};

// Create a new drink category
const createDrinkCategory = async (req, res) => {
  try {
    const { restaurantId, translations } = req.body;
    const language = getUserLanguage(req);

    if (!translations || translations.length === 0) {
      return res
        .status(400)
        .json({ message: 'at_least_one_translation_required' });
    }

    const translatedData = await autoTranslate(translations);

    // Check if category with same name exists in any language
    const existingCategories = await DrinkCategory.findAll({
      include: [
        {
          model: DrinkCategoryTranslation,
          as: 'translations',
        },
      ],
      where: { restaurantId },
      order: [['position', 'DESC']],
    });

    const categoryExists = existingCategories.some((category) =>
      category.translations.some((translation) =>
        translatedData.some(
          (t) =>
            t.language === translation.language && t.name === translation.name,
        ),
      ),
    );

    if (categoryExists) {
      return res.status(400).json({ message: 'category_already_exists' });
    }

    const lastPosition = existingCategories[0]?.position ?? -1;
    const newPosition = lastPosition + 1;

    // Create category
    const category = await DrinkCategory.create({
      restaurantId,
      position: newPosition,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true, // Default to true if not provided
    });

    // Create translations
    const translationPromises = translatedData.map((translation) =>
      DrinkCategoryTranslation.create({
        drinkCategoryId: category.id,
        language: translation.language,
        name: translation.name,
        description: translation.description || null,
      }),
    );

    await Promise.all(translationPromises);

    // Fetch created category with translations
    const createdCategory = await DrinkCategory.findByPk(category.id, {
      include: [
        {
          model: DrinkCategoryTranslation,
          as: 'translations',
        },
      ],
    });

    const userTranslation = createdCategory.translations.find(
      (t) => t.language === language,
    );
    const anyTranslation = createdCategory.translations[0];

    const result = {
      ...createdCategory.get(),
      name: (userTranslation || anyTranslation)?.name || '',
      description: (userTranslation || anyTranslation)?.description || '',
    };

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating drink category:', error);
    res.status(500).json({ error: 'Failed to create drink category' });
  }
};

// Update an existing drink category
const updateDrinkCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { translations, isActive } = req.body;
    const language = getUserLanguage(req);

    if (!translations || translations.length === 0) {
      return res
        .status(400)
        .json({ message: 'at_least_one_translation_required' });
    }

    const translatedData = await autoTranslate(translations);

    const category = await DrinkCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Delete existing translations
    await DrinkCategoryTranslation.destroy({
      where: { drinkCategoryId: category.id },
    });

    // Create new translations
    for (const translation of translatedData) {
      await DrinkCategoryTranslation.create({
        drinkCategoryId: category.id,
        language: translation.language,
        name: translation.name,
        description: translation.description || null,
      });
    }

    // Ažuriramo isActive polje ako je proslijeđeno
    if (isActive !== undefined) {
      await category.update({ isActive });
    }

    // Fetch updated category
    const updated = await DrinkCategory.findByPk(id, {
      include: [{ model: DrinkCategoryTranslation, as: 'translations' }],
    });

    const userTranslation = updated.translations.find(
      (t) => t.language === language,
    );
    const anyTranslation = updated.translations[0];

    const result = {
      ...updated.get(),
      name: (userTranslation || anyTranslation)?.name || '',
      description: (userTranslation || anyTranslation)?.description || '',
      translations: updated.translations,
    };

    res.json(result);
  } catch (error) {
    console.error('Error updating drink category:', error);
    res.status(500).json({ message: 'Failed to update drink category' });
  }
};

// Delete a drink category
const deleteDrinkCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await DrinkCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const drinkItems = await DrinkItem.findAll({ where: { categoryId: id } });

    // Delete all image variants for each drink item
    for (const item of drinkItems) {
      if (item.imageUrl) {
        const baseFileName = getBaseFileName(item.imageUrl);
        const folder = getFolderFromKey(item.imageUrl);
        const variants = ['thumb', 'medium', 'full'];
        for (const variant of variants) {
          const key = `${folder}/${baseFileName}-${variant}.jpg`;
          try {
            await deleteFromS3(key);
          } catch (error) {
            console.error(`Failed to delete ${key}:`, error);
          }
        }
      }
    }

    await DrinkItem.destroy({ where: { categoryId: id } });

    await logAudit({
      userId: req.user ? req.user.id : null,
      action: ActionTypes.DELETE,
      entity: Entities.DRINK_CATEGORY,
      entityId: category.id,
      restaurantId: category.restaurantId,
      changes: { old: category.get() },
    });

    await category.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete drink category' });
  }
};

// Update drink category order
const updateDrinkCategoryOrder = async (req, res) => {
  try {
    const { order } = req.body;
    for (let i = 0; i < order.length; i++) {
      await DrinkCategory.update({ position: i }, { where: { id: order[i] } });
    }
    res
      .status(200)
      .json({ message: 'Drink category order updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update drink category order' });
  }
};

// Update drink item order within a category
const updateDrinkItemOrder = async (req, res) => {
  try {
    const { order } = req.body;
    for (let i = 0; i < order.length; i++) {
      await DrinkItem.update({ position: i }, { where: { id: order[i] } });
    }
    res.status(200).json({ message: 'Drink item order updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update drink item order' });
  }
};

// Get all drink items for admin (including inactive)
const getAllDrinkItemsForAdmin = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const language = getUserLanguage(req);

    const drinkItems = await DrinkItem.findAll({
      where: { restaurantId }, // Uključuje sve stavke, aktivne i neaktivne
      order: [['position', 'ASC']],
      include: [
        {
          model: DrinkItemTranslation,
          as: 'translations',
        },
      ],
    });

    const formattedDrinkItems = drinkItems.map((item) => {
      const itemData = item.toJSON();
      const userTranslation = itemData.translations.find(
        (t) => t.language === language,
      );
      const anyTranslation = itemData.translations[0];

      // For admin list view, use thumbnail and include all variants
      const imageUrls = itemData.imageUrl ? getImageUrls(itemData.imageUrl) : null;

      return {
        ...itemData,
        name: (userTranslation || anyTranslation)?.name || '',
        description: (userTranslation || anyTranslation)?.description || '',
        price: parseFloat(itemData.price).toFixed(2),
        imageUrl: itemData.imageUrl
          ? getMediaUrl(itemData.imageUrl, 'image', 'thumbnail')
          : null,
        imageUrls: imageUrls,
      };
    });

    res.json(formattedDrinkItems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch drink items' });
  }
};

// Get all drink categories for admin (including inactive)
const getAllDrinkCategoriesForAdmin = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const language = getUserLanguage(req);

    const categories = await DrinkCategory.findAll({
      where: { restaurantId }, // Uključuje sve kategorije, aktivne i neaktivne
      order: [['position', 'ASC']],
      include: [
        {
          model: DrinkCategoryTranslation,
          as: 'translations',
        },
      ],
    });

    const formattedCategories = categories.map((category) => {
      const categoryData = category.toJSON();
      const userTranslation = categoryData.translations.find(
        (t) => t.language === language,
      );
      const anyTranslation = categoryData.translations[0];

      return {
        ...categoryData,
        name: (userTranslation || anyTranslation)?.name || '',
      };
    });

    res.json(formattedCategories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch drink categories' });
  }
};

module.exports = {
  getDrinkItems,
  getDrinkCategories,
  createDrinkItem,
  updateDrinkItem,
  deleteDrinkItem,
  createDrinkCategory,
  updateDrinkCategory,
  deleteDrinkCategory,
  updateDrinkCategoryOrder,
  updateDrinkItemOrder,
  getAllDrinkItemsForAdmin,
  getAllDrinkCategoriesForAdmin,
};
