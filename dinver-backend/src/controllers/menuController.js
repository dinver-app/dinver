const { MenuItem, MenuCategory } = require('../../models');

// Get all menu items for a specific restaurant
exports.getMenuItems = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const menuItems = await MenuItem.findAll({
      where: { restaurantId },
    });

    // Format price for each menu item before sending the response
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
exports.getCategoryItems = async (req, res) => {
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
exports.createMenuItem = async (req, res) => {
  try {
    const { name, price, categoryId, restaurantId } = req.body;
    const formattedPrice = parseFloat(price).toFixed(2);
    const menuItem = await MenuItem.create({
      name,
      price: formattedPrice,
      restaurantId: restaurantId,
      categoryId: categoryId,
    });
    console.log(menuItem);
    res.status(201).json(menuItem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create menu item' });
  }
};

// Update an existing menu item
exports.updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, categoryId } = req.body;
    const menuItem = await MenuItem.findByPk(id);
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    const formattedPrice = parseFloat(price).toFixed(2); // Format price to two decimal places
    menuItem.name = name;
    menuItem.price = formattedPrice;
    menuItem.categoryId = categoryId;
    await menuItem.save();
    res.json(menuItem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update menu item' });
  }
};

// Delete a menu item
exports.deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const menuItem = await MenuItem.findByPk(id);
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    await menuItem.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
};

// Create a new category for a specific restaurant
exports.createCategory = async (req, res) => {
  try {
    const { name, restaurantId } = req.body;
    const category = await MenuCategory.create({
      name,
      restaurantId: restaurantId,
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' });
  }
};

// Update an existing category
exports.updateCategory = async (req, res) => {
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
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await MenuCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    await category.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
};
