const {
  MenuItem,
  MenuCategory,
  MenuItemTranslation,
  MenuCategoryTranslation,
  Allergen,
  Coupon,
} = require('../../models');
const { Op } = require('sequelize');
const { uploadToS3 } = require('../../utils/s3Upload');
const { deleteFromS3 } = require('../../utils/s3Delete');
const { logAudit, ActionTypes, Entities } = require('../../utils/auditLogger');
const {
  autoTranslate,
  translateSizeNameBoth,
} = require('../../utils/translate');
const { getMediaUrl } = require('../../config/cdn');

// Helper function to get user language
const getUserLanguage = (req) => {
  return req.user?.language || 'hr';
};

// Get all menu items for a specific restaurant
const getMenuItems = async (req, res) => {
  const { restaurantId } = req.params;
  try {
    const language = getUserLanguage(req);

    const menuItems = await MenuItem.findAll({
      where: {
        restaurantId,
        isActive: true, // Samo aktivne stavke
      },
      order: [['position', 'ASC']],
      include: [
        {
          model: MenuItemTranslation,
          as: 'translations',
        },
        {
          model: MenuCategory,
          as: 'category',
          include: [
            {
              model: MenuCategoryTranslation,
              as: 'translations',
            },
          ],
        },
      ],
    });

    const formattedMenuItems = await Promise.all(
      menuItems.map(async (item) => {
        const itemData = item.toJSON();
        const userTranslation = itemData.translations.find(
          (t) => t.language === language,
        );
        const anyTranslation = itemData.translations[0];

        // Build sizes with translations when available
        let sizes = null;
        if (itemData.hasSizes && Array.isArray(itemData.sizes)) {
          sizes = await Promise.all(
            itemData.sizes.map(async (s) => {
              const name = s?.name || '';
              const price = s?.price != null ? Number(s.price) : null;
              const tr = await translateSizeNameBoth(name);
              return {
                name: {
                  hr: tr.hr,
                  en: tr.en,
                },
                price,
              };
            }),
          );
        }

        return {
          ...itemData,
          name: (userTranslation || anyTranslation)?.name || '',
          description: (userTranslation || anyTranslation)?.description || '',
          price: parseFloat(itemData.price).toFixed(2),
          imageUrl: itemData.imageUrl
            ? getMediaUrl(itemData.imageUrl, 'image')
            : null,
          sizes,
        };
      }),
    );

    res.json(formattedMenuItems);
  } catch (error) {
    console.error('Error fetching menu items:', {
      restaurantId,
      userId: req.user?.id || null,
      message: error?.message,
      code: error?.original?.code || error?.code,
      hint: error?.original?.hint,
    });
    return res.status(500).json({
      error: 'Failed to fetch menu items',
      ...(process.env.NODE_ENV !== 'production'
        ? { details: error?.message || 'Unknown error' }
        : {}),
    });
  }
};

// Get all categories for a specific restaurant
const getCategoryItems = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const language = getUserLanguage(req);

    const categories = await MenuCategory.findAll({
      where: {
        restaurantId,
        isActive: true, // Samo aktivne kategorije
      },
      order: [['position', 'ASC']],
      include: [
        {
          model: MenuCategoryTranslation,
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
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// Create a new menu item for a specific restaurant
const createMenuItem = async (req, res) => {
  try {
    const translations = JSON.parse(req.body.translations || '[]');
    const translatedData = await autoTranslate(translations);
    const { price, restaurantId } = req.body;
    const allergenIds = req.body.allergenIds
      ? JSON.parse(req.body.allergenIds)
      : [];
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
    const existingItems = await MenuItem.findAll({
      where: { restaurantId },
      order: [['position', 'DESC']],
    });

    const lastPosition = existingItems[0]?.position ?? -1;
    const newPosition = lastPosition + 1;

    // Handle image upload
    let imageKey = null;
    if (file) {
      const folder = 'menu_items';
      try {
        imageKey = await uploadToS3(file, folder);
      } catch (uploadError) {
        console.error('Error uploading to S3:', uploadError);
        return res.status(500).json({ error: 'Failed to upload image' });
      }
    }

    // Create menu item
    const menuItem = await MenuItem.create({
      price,
      restaurantId,
      position: newPosition,
      allergens: allergenIds,
      imageUrl: imageKey,
      categoryId,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true, // Default to true if not provided
    });

    // Create translations
    for (const translation of translatedData) {
      await MenuItemTranslation.create({
        menuItemId: menuItem.id,
        language: translation.language,
        name: translation.name,
        description: translation.description || '',
      });
    }

    // Fetch created item with translations
    const createdItem = await MenuItem.findByPk(menuItem.id, {
      include: [{ model: MenuItemTranslation, as: 'translations' }],
    });

    const userTranslation = createdItem.translations.find(
      (t) => t.language === language,
    );
    const anyTranslation = createdItem.translations[0];

    const result = {
      ...createdItem.get(),
      name: (userTranslation || anyTranslation)?.name || '',
      description: (userTranslation || anyTranslation)?.description || '',
      imageUrl: imageKey ? getMediaUrl(imageKey, 'image') : null,
    };

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
};

// Update an existing menu item
const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const translations = JSON.parse(req.body.translations || '[]');
    const translatedData = await autoTranslate(translations);
    const price = req.body.price;
    const allergenIds = req.body.allergenIds
      ? JSON.parse(req.body.allergenIds)
      : undefined;
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

    const menuItem = await MenuItem.findByPk(id);
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    // Handle image
    let imageKey = menuItem.imageUrl;
    if (file) {
      if (menuItem.imageUrl) {
        const oldKey = menuItem.imageUrl.split('/').pop();
        await deleteFromS3(`menu_items/${oldKey}`);
      }
      const folder = 'menu_items';
      imageKey = await uploadToS3(file, folder);
    } else if (removeImage === 'true') {
      if (menuItem.imageUrl) {
        const oldKey = menuItem.imageUrl.split('/').pop();
        await deleteFromS3(`menu_items/${oldKey}`);
      }
      imageKey = null;
    }

    // Delete existing translations
    await MenuItemTranslation.destroy({
      where: { menuItemId: menuItem.id },
    });

    // Create new translations
    for (const translation of translatedData) {
      await MenuItemTranslation.create({
        menuItemId: menuItem.id,
        language: translation.language,
        name: translation.name,
        description: translation.description || '',
      });
    }

    // Update menu item
    await menuItem.update({
      price: price !== undefined ? price : menuItem.price,
      imageUrl: imageKey,
      allergens: allergenIds !== undefined ? allergenIds : menuItem.allergens,
      categoryId: categoryId !== undefined ? categoryId : menuItem.categoryId,
      isActive:
        req.body.isActive !== undefined ? req.body.isActive : menuItem.isActive,
    });

    // Fetch updated item
    const updated = await MenuItem.findByPk(id, {
      include: [{ model: MenuItemTranslation, as: 'translations' }],
    });

    const userTranslation = updated.translations.find(
      (t) => t.language === language,
    );
    const anyTranslation = updated.translations[0];

    const result = {
      ...updated.get(),
      name: (userTranslation || anyTranslation)?.name || '',
      description: (userTranslation || anyTranslation)?.description || '',
      imageUrl: imageKey ? getMediaUrl(imageKey, 'image') : null,
      translations: updated.translations,
    };

    res.json(result);
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ message: 'Failed to update menu item' });
  }
};

// Delete a menu item
const deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const menuItem = await MenuItem.findByPk(id);
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Prevent deletion if item is referenced by coupons
    const referencingCoupons = await Coupon.findAll({
      where: { rewardItemId: id },
      attributes: ['id', 'title', 'status', 'type'],
    });
    if (referencingCoupons.length > 0) {
      return res.status(409).json({
        error: 'cannot_delete_menu_item_in_use_by_coupons',
        message:
          'Ova stavka je povezana s kuponima i ne može se obrisati dok se kuponi ne ažuriraju ili obrišu.',
        coupons: referencingCoupons,
      });
    }

    // Delete image from S3 if it exists
    if (menuItem.imageUrl) {
      const fileName = menuItem.imageUrl.split('/').pop();
      const key = `menu_items/${fileName}`;
      await deleteFromS3(key);
    }

    // Log the delete action
    await logAudit({
      userId: req.user ? req.user.id : null,
      action: ActionTypes.DELETE,
      entity: Entities.MENU_ITEM,
      entityId: menuItem.id,
      restaurantId: menuItem.restaurantId,
      changes: { old: menuItem.get() },
    });

    await menuItem.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
};

// Create a new category for a specific restaurant
const createCategory = async (req, res) => {
  try {
    const { restaurantId, translations, isActive } = req.body;
    const translatedData = await autoTranslate(translations);
    const language = getUserLanguage(req);

    if (!translatedData || translatedData.length === 0) {
      return res
        .status(400)
        .json({ message: 'at_least_one_translation_required' });
    }

    // Check if category with same name exists in any language
    const existingCategories = await MenuCategory.findAll({
      include: [
        {
          model: MenuCategoryTranslation,
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
    const category = await MenuCategory.create({
      restaurantId,
      position: newPosition,
      isActive: isActive !== undefined ? isActive : true, // Default to true if not provided
    });

    // Create translations
    const translationPromises = translatedData.map((translation) =>
      MenuCategoryTranslation.create({
        menuCategoryId: category.id,
        language: translation.language,
        name: translation.name,
        description: translation.description || null,
      }),
    );

    await Promise.all(translationPromises);

    // Fetch the created category with translations
    const createdCategory = await MenuCategory.findByPk(category.id, {
      include: [
        {
          model: MenuCategoryTranslation,
          as: 'translations',
        },
      ],
    });

    // Format response
    const userTranslation = createdCategory.translations.find(
      (t) => t.language === language,
    );
    const anyTranslation = createdCategory.translations[0];

    const result = {
      ...createdCategory.get(),
      name: (userTranslation || anyTranslation)?.name || '',
      description: (userTranslation || anyTranslation)?.description || '',
    };

    await logAudit({
      userId: req.user ? req.user.id : null,
      action: ActionTypes.CREATE,
      entity: Entities.MENU_CATEGORY,
      entityId: result.id,
      restaurantId: restaurantId,
      changes: { new: result },
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
};

// Update an existing category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { translations, isActive } = req.body;
    const translatedData = await autoTranslate(translations);
    const language = getUserLanguage(req);

    if (!translatedData || translatedData.length === 0) {
      return res
        .status(400)
        .json({ message: 'at_least_one_translation_required' });
    }

    const category = await MenuCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Prvo obrišemo sve postojeće prijevode
    await MenuCategoryTranslation.destroy({
      where: { menuCategoryId: category.id },
    });

    // Zatim kreiramo nove prijevode
    for (const translation of translatedData) {
      await MenuCategoryTranslation.create({
        menuCategoryId: category.id,
        language: translation.language,
        name: translation.name,
        description: translation.description || null,
      });
    }

    // Ažuriramo isActive polje ako je proslijeđeno
    if (isActive !== undefined) {
      await category.update({ isActive });
    }

    // Dohvatimo ažuriranu kategoriju
    const updated = await MenuCategory.findByPk(id, {
      include: [{ model: MenuCategoryTranslation, as: 'translations' }],
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
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Failed to update category' });
  }
};

// Delete a category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await MenuCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Find all items in the category
    const menuItems = await MenuItem.findAll({ where: { categoryId: id } });

    // Block deletion if any item is referenced by coupons
    const itemIds = menuItems.map((i) => i.id);
    if (itemIds.length > 0) {
      const referencingCoupons = await Coupon.findAll({
        where: { rewardItemId: { [Op.in]: itemIds } },
        attributes: ['id', 'title', 'status', 'type', 'rewardItemId'],
      });
      if (referencingCoupons.length > 0) {
        return res.status(409).json({
          error: 'cannot_delete_category_items_in_use_by_coupons',
          message:
            'Neke stavke u ovoj kategoriji su povezane s kuponima. Ažurirajte ili obrišite te kupone prije brisanja kategorije.',
          coupons: referencingCoupons,
        });
      }
    }

    // Delete images from S3 for each item
    for (const item of menuItems) {
      if (item.imageUrl) {
        const fileName = item.imageUrl.split('/').pop();
        const key = `menu_items/${fileName}`;
        await deleteFromS3(key);
      }
    }

    // Delete all items in the category
    await MenuItem.destroy({ where: { categoryId: id } });

    // Log the delete action
    await logAudit({
      userId: req.user ? req.user.id : null,
      action: ActionTypes.DELETE,
      entity: Entities.MENU_CATEGORY,
      entityId: category.id,
      restaurantId: category.restaurantId,
      changes: { old: category.get() },
    });

    await category.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
};

const getAllAllergens = async (req, res) => {
  try {
    const allergens = await Allergen.findAll();
    res.json(allergens);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch allergens' });
  }
};

// Update category order
const updateCategoryOrder = async (req, res) => {
  try {
    const { order } = req.body;
    for (let i = 0; i < order.length; i++) {
      await MenuCategory.update({ position: i }, { where: { id: order[i] } });
    }
    res.status(200).json({ message: 'Category order updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update category order' });
  }
};

// Update item order within a category
const updateItemOrder = async (req, res) => {
  try {
    const { order } = req.body;
    for (let i = 0; i < order.length; i++) {
      await MenuItem.update({ position: i }, { where: { id: order[i] } });
    }
    res.status(200).json({ message: 'Item order updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update item order' });
  }
};

// Get all menu items for admin (including inactive)
const getAllMenuItemsForAdmin = async (req, res) => {
  const { restaurantId } = req.params;
  try {
    const language = getUserLanguage(req);

    const menuItems = await MenuItem.findAll({
      where: { restaurantId }, // Uključuje sve stavke, aktivne i neaktivne
      order: [['position', 'ASC']],
      include: [
        {
          model: MenuItemTranslation,
          as: 'translations',
        },
      ],
    });

    const formattedMenuItems = await Promise.all(
      menuItems.map(async (item) => {
        const itemData = item.toJSON();
        const userTranslation = itemData.translations.find(
          (t) => t.language === language,
        );
        const anyTranslation = itemData.translations[0];

        // Build sizes with translations when available
        let sizes = null;
        if (itemData.hasSizes && Array.isArray(itemData.sizes)) {
          sizes = await Promise.all(
            itemData.sizes.map(async (s) => {
              const name = s?.name || '';
              const price = s?.price != null ? Number(s.price) : null;
              const tr = await translateSizeNameBoth(name);
              return {
                name: {
                  hr: tr.hr,
                  en: tr.en,
                },
                price,
              };
            }),
          );
        }

        return {
          ...itemData,
          name: (userTranslation || anyTranslation)?.name || '',
          description: (userTranslation || anyTranslation)?.description || '',
          price: parseFloat(itemData.price).toFixed(2),
          imageUrl: itemData.imageUrl
            ? getMediaUrl(itemData.imageUrl, 'image')
            : null,
          sizes,
        };
      }),
    );

    res.json(formattedMenuItems);
  } catch (error) {
    console.error('Error fetching all menu items for admin:', {
      restaurantId,
      userId: req.user?.id || null,
      message: error?.message,
      code: error?.original?.code || error?.code,
      hint: error?.original?.hint,
    });
    return res.status(500).json({
      error: 'Failed to fetch menu items',
      ...(process.env.NODE_ENV !== 'production'
        ? { details: error?.message || 'Unknown error' }
        : {}),
    });
  }
};

// Get all categories for admin (including inactive)
const getAllCategoriesForAdmin = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const language = getUserLanguage(req);

    const categories = await MenuCategory.findAll({
      where: { restaurantId }, // Uključuje sve kategorije, aktivne i neaktivne
      order: [['position', 'ASC']],
      include: [
        {
          model: MenuCategoryTranslation,
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
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

module.exports = {
  getMenuItems,
  getCategoryItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllAllergens,
  updateCategoryOrder,
  updateItemOrder,
  getAllMenuItemsForAdmin,
  getAllCategoriesForAdmin,
};
