const { DrinkItem, DrinkCategory } = require('../../models');
const { uploadToS3 } = require('../../utils/s3Upload');
const { deleteFromS3 } = require('../../utils/s3Delete');
const { logAudit, ActionTypes, Entities } = require('../../utils/auditLogger');

// Get all drink items for a specific restaurant
const getDrinkItems = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const drinkItems = await DrinkItem.findAll({
      where: { restaurantId },
      order: [['position', 'ASC']],
    });

    const formattedDrinkItems = drinkItems.map((item) => ({
      ...item.toJSON(),
      price: parseFloat(item.price).toFixed(2),
    }));
    res.json(formattedDrinkItems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch drink items' });
  }
};

// Get all drink categories for a specific restaurant
const getDrinkCategories = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const categories = await DrinkCategory.findAll({
      where: { restaurantId },
      order: [['position', 'ASC']],
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch drink categories' });
  }
};

// Create a new drink item for a specific restaurant
const createDrinkItem = async (req, res) => {
  try {
    const { name, price, categoryId, restaurantId, description } = req.body;
    const file = req.file;

    let imageUrl = null;
    if (file) {
      const folder = 'drink_items';
      imageUrl = await uploadToS3(file, folder);
    }

    const formattedPrice = parseFloat(price.replace(',', '.')).toFixed(2);
    const drinkItem = await DrinkItem.create({
      name,
      price: formattedPrice,
      restaurantId,
      categoryId,
      imageUrl,
      description,
    });

    // Log the create action
    await logAudit({
      userId: req.user ? req.user.id : null,
      action: ActionTypes.CREATE,
      entity: Entities.DRINK_ITEM,
      entityId: drinkItem.id,
      restaurantId: restaurantId,
      changes: { new: drinkItem.get() },
    });

    res.status(201).json(drinkItem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create drink item' });
  }
};

// Update an existing drink item
const updateDrinkItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, categoryId, removeImage, description } = req.body;
    const file = req.file;

    const drinkItem = await DrinkItem.findByPk(id);
    if (!drinkItem) {
      return res.status(404).json({ error: 'Drink item not found' });
    }

    const oldData = { ...drinkItem.get() };

    let imageUrl = drinkItem.imageUrl;

    // Delete the old image if a new one is uploaded
    if (file) {
      if (drinkItem.imageUrl) {
        const oldKey = drinkItem.imageUrl.split('/').pop();
        await deleteFromS3(`drink_items/${oldKey}`);
      }
      const folder = 'drink_items';
      imageUrl = await uploadToS3(file, folder);
    } else if (removeImage === 'true') {
      if (drinkItem.imageUrl) {
        const oldKey = drinkItem.imageUrl.split('/').pop();
        await deleteFromS3(`drink_items/${oldKey}`);
      }
      imageUrl = null;
    }

    const formattedPrice = parseFloat(price.replace(',', '.')).toFixed(2);
    const updatedDrinkItem = await drinkItem.update({
      name,
      price: formattedPrice,
      categoryId,
      imageUrl,
      description,
    });

    // Log the update action
    await logAudit({
      userId: req.user ? req.user.id : null,
      action: ActionTypes.UPDATE,
      entity: Entities.DRINK_ITEM,
      entityId: drinkItem.id,
      restaurantId: drinkItem.restaurantId,
      changes: { old: oldData, new: updatedDrinkItem.get() },
    });

    res.json(updatedDrinkItem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update drink item' });
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

    // Log the delete action
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

// Create a new drink category for a specific restaurant
const createDrinkCategory = async (req, res) => {
  try {
    const { name, restaurantId } = req.body;

    // Check if a category with the same name and restaurantId already exists
    const existingCategory = await DrinkCategory.findOne({
      where: {
        name,
        restaurantId,
      },
    });

    if (existingCategory) {
      return res.status(400).json({ message: 'category_already_exists' });
    }

    const category = await DrinkCategory.create({
      name,
      restaurantId,
    });

    // Log the create action
    await logAudit({
      userId: req.user ? req.user.id : null,
      action: ActionTypes.CREATE,
      entity: Entities.DRINK_CATEGORY,
      entityId: category.id,
      restaurantId: restaurantId,
      changes: { new: category.get() },
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create drink category' });
  }
};

// Update an existing drink category
const updateDrinkCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const category = await DrinkCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    const oldData = { ...category.get() };
    category.name = name;
    await category.save();

    // Log the update action
    await logAudit({
      userId: req.user ? req.user.id : null,
      action: ActionTypes.UPDATE,
      entity: Entities.DRINK_CATEGORY,
      entityId: category.id,
      restaurantId: category.restaurantId,
      changes: { old: oldData, new: category.get() },
    });

    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update drink category' });
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

    // Find all items in the category
    const drinkItems = await DrinkItem.findAll({ where: { categoryId: id } });

    // Delete all items in the category
    await DrinkItem.destroy({ where: { categoryId: id } });

    // Log the delete action
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
};
