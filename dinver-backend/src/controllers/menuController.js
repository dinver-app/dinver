const { MenuCategory, MenuItem } = require('../../models');

// Add a new menu category
async function addMenuCategory(req, res) {
  try {
    const { name, restaurantId } = req.body;

    const newCategory = await MenuCategory.create({ name, restaurantId });
    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Error adding menu category:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while adding the menu category' });
  }
}

// Update an existing menu category
async function updateMenuCategory(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Check if the user has edit access to the restaurant
    // const userRest = await UserRestaurant.findOne({
    //   where: {
    //     userId: req.user.id,
    //     restaurantId: req.body.restaurantId,
    //     role: 'edit',
    //   },
    // });

    // if (!userRest) {
    //   return res.status(403).json({
    //     error: 'Access denied. Only editors can update menu categories.',
    //   });
    // }

    const category = await MenuCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: 'Menu category not found' });
    }

    await category.update({ name });
    res.json(category);
  } catch (error) {
    console.error('Error updating menu category:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while updating the menu category' });
  }
}

// Delete a menu category
async function deleteMenuCategory(req, res) {
  try {
    const { id } = req.params;

    const category = await MenuCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: 'Menu category not found' });
    }

    await category.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting menu category:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while deleting the menu category' });
  }
}

// Add a new menu item
async function addMenuItem(req, res) {
  try {
    const {
      name,
      price,
      image_url,
      ingredients,
      allergens,
      description,
      categoryId,
    } = req.body;

    const newItem = await MenuItem.create({
      name,
      price,
      image_url,
      ingredients,
      allergens,
      description,
      categoryId,
    });
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error adding menu item:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while adding the menu item' });
  }
}

// Update an existing menu item
async function updateMenuItem(req, res) {
  try {
    const { id } = req.params;
    const { name, price, image_url, ingredients, allergens, description } =
      req.body;

    // Check if the user has edit access to the restaurant
    // const userRest = await UserRestaurant.findOne({
    //   where: {
    //     userId: req.user.id,
    //     restaurantId: req.body.restaurantId,
    //     role: 'edit',
    //   },
    // });

    // if (!userRest) {
    //   return res
    //     .status(403)
    //     .json({ error: 'Access denied. Only editors can update menu items.' });
    // }

    const item = await MenuItem.findByPk(id);
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    await item.update({
      name,
      price,
      image_url,
      ingredients,
      allergens,
      description,
    });
    res.json(item);
  } catch (error) {
    console.error('Error updating menu item:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while updating the menu item' });
  }
}

// Delete a menu item
async function deleteMenuItem(req, res) {
  try {
    const { id } = req.params;

    const item = await MenuItem.findByPk(id);
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    await item.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while deleting the menu item' });
  }
}

// Get all categories for a restaurant
async function getCategories(req, res) {
  try {
    const { restaurantId } = req.params;

    const categories = await MenuCategory.findAll({
      where: { restaurantId },
    });

    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while fetching categories' });
  }
}

// Get all menu items for a restaurant
async function getMenuItems(req, res) {
  try {
    const { restaurantId } = req.params;

    const items = await MenuItem.findAll({
      include: {
        model: MenuCategory,
        where: { restaurantId },
      },
    });

    res.json(items);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while fetching menu items' });
  }
}

module.exports = {
  addMenuCategory,
  updateMenuCategory,
  deleteMenuCategory,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getCategories,
  getMenuItems,
};
