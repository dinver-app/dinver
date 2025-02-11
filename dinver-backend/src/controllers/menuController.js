const {
  MenuItem,
  MenuCategory,
  IngredientAllergen,
  Ingredient,
  Allergen,
} = require('../../models');
const { uploadToS3 } = require('../../utils/s3Upload');
const { deleteFromS3 } = require('../../utils/s3Delete');

// Get all menu items for a specific restaurant
const getMenuItems = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const menuItems = await MenuItem.findAll({
      where: { restaurantId },
    });

    const formattedMenuItems = menuItems.map((item) => ({
      ...item.toJSON(),
      price: parseFloat(item.price).toFixed(2),
    }));
    res.json(formattedMenuItems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
};

// Get all categories for a specific restaurant
const getCategoryItems = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const categories = await MenuCategory.findAll({
      where: { restaurantId },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// Create a new menu item for a specific restaurant
const createMenuItem = async (req, res) => {
  try {
    const { name, price, categoryId, restaurantId, allergenIds, type } =
      req.body;
    const file = req.file;

    let imageUrl = null;
    if (file) {
      const folder = 'menu_items';
      imageUrl = await uploadToS3(file, folder);
    }

    const formattedAllergenIds = Array.isArray(allergenIds)
      ? allergenIds.map((id) => parseInt(id))
      : [parseInt(allergenIds)];

    const formattedPrice = parseFloat(price).toFixed(2);
    const menuItem = await MenuItem.create({
      name,
      price: formattedPrice,
      restaurantId,
      categoryId,
      imageUrl,
      allergens: formattedAllergenIds,
      type,
    });
    res.status(201).json(menuItem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create menu item' });
  }
};

// Update an existing menu item
const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, categoryId, removeImage, allergenIds, description } =
      req.body;
    const file = req.file;

    const menuItem = await MenuItem.findByPk(id);
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    let imageUrl = menuItem.imageUrl;

    // Delete the old image if a new one is uploaded
    if (file) {
      if (menuItem.imageUrl) {
        const oldKey = menuItem.imageUrl.split('/').pop();
        await deleteFromS3(`menu_items/${oldKey}`);
      }
      const folder = 'menu_items';
      imageUrl = await uploadToS3(file, folder);
    } else if (removeImage === 'true') {
      if (menuItem.imageUrl) {
        const oldKey = menuItem.imageUrl.split('/').pop();
        await deleteFromS3(`menu_items/${oldKey}`);
      }
      imageUrl = null;
    }

    const formattedAllergenIds = Array.isArray(allergenIds)
      ? allergenIds.map((id) => parseInt(id))
      : [parseInt(allergenIds)];
    const formattedCategoryId = categoryId === '' ? null : categoryId;
    const formattedPrice = parseFloat(price).toFixed(2);
    await menuItem.update({
      name,
      price: formattedPrice,
      categoryId: formattedCategoryId,
      imageUrl,
      allergens: formattedAllergenIds,
      description,
    });

    res.json(menuItem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update menu item' });
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

    // Delete image from S3 if it exists
    if (menuItem.imageUrl) {
      const fileName = menuItem.imageUrl.split('/').pop();
      const key = `menu_items/${fileName}`;
      await deleteFromS3(key);
    }

    await menuItem.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
};

// Create a new category for a specific restaurant
const createCategory = async (req, res) => {
  try {
    const { name, restaurantId } = req.body;

    // Provjera postoji li već kategorija s istim imenom i restaurantId
    const existingCategory = await MenuCategory.findOne({
      where: {
        name,
        restaurantId,
      },
    });

    if (existingCategory) {
      return res.status(400).json({ message: 'category_already_exists' });
    }

    const category = await MenuCategory.create({
      name,
      restaurantId,
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' });
  }
};

// Update an existing category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const category = await MenuCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    category.name = name;
    await category.save();
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update category' });
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

    await category.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
};

const getAllIngredients = async (req, res) => {
  try {
    const ingredients = await Ingredient.findAll();
    res.json(ingredients);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ingredients' });
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
    const { order } = req.body; // Array of item IDs in the desired order
    for (let i = 0; i < order.length; i++) {
      await MenuItem.update({ position: i }, { where: { id: order[i] } });
    }
    res.status(200).json({ message: 'Item order updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update item order' });
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
  getAllIngredients,
  getAllAllergens,
  updateCategoryOrder,
  updateItemOrder,
};
