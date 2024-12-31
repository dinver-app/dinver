const { MenuCategory, Restaurant } = require('../../models');

async function createCategory(req, res) {
  try {
    const { restaurantId } = req.params;
    const { name } = req.body;

    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const category = await MenuCategory.create({
      restaurant_id: restaurantId,
      name,
    });
    res.status(201).json(category);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while creating the category' });
  }
}

async function getCategories(req, res) {
  try {
    const { restaurantId } = req.params;
    const categories = await MenuCategory.findAll({
      where: { restaurant_id: restaurantId },
    });
    res.json(categories);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while fetching categories' });
  }
}

module.exports = {
  createCategory,
  getCategories,
};
