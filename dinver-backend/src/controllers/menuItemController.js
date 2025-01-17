const { MenuItem, MenuCategory } = require('../../models');

async function createItem(req, res) {
  try {
    const { categoryId } = req.params;
    const { name, price, image_url, ingredients, allergens, description } =
      req.body;

    const category = await MenuCategory.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const item = await MenuItem.create({
      category_id: categoryId,
      name,
      price,
      image_url,
      ingredients,
      allergens,
      description,
    });
    res.status(201).json(item);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while creating the item' });
  }
}

async function getItems(req, res) {
  try {
    const { categoryId } = req.params;
    const items = await MenuItem.findAll({
      where: { category_id: categoryId },
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching items' });
  }
}

module.exports = {
  createItem,
  getItems,
};
