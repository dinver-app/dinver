const { MenuCategory, MenuItem, UserRestaurant } = require('../../models');

async function updateMenuCategory(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Check if the user has edit access to the restaurant
    const userRest = await UserRestaurant.findOne({
      where: {
        userId: req.user.id,
        restaurantId: req.body.restaurantId,
        role: 'edit',
      },
    });

    if (!userRest) {
      return res.status(403).json({
        error: 'Access denied. Only editors can update menu categories.',
      });
    }

    const category = await MenuCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: 'Menu category not found' });
    }

    await category.update({ name });
    res.json(category);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while updating the menu category' });
  }
}

async function updateMenuItem(req, res) {
  try {
    const { id } = req.params;
    const { name, price, image_url, ingredients, allergens, description } =
      req.body;

    // Check if the user has edit access to the restaurant
    const userRest = await UserRestaurant.findOne({
      where: {
        userId: req.user.id,
        restaurantId: req.body.restaurantId,
        role: 'edit',
      },
    });

    if (!userRest) {
      return res
        .status(403)
        .json({ error: 'Access denied. Only editors can update menu items.' });
    }

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
    res
      .status(500)
      .json({ error: 'An error occurred while updating the menu item' });
  }
}

module.exports = {
  updateMenuCategory,
  updateMenuItem,
};
