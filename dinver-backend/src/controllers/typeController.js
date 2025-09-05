const {
  FoodType,
  EstablishmentType,
  EstablishmentPerk,
  MealType,
  PriceCategory,
  DietaryType,
} = require('../../models');

// Get all food types
async function getAllFoodTypes(req, res) {
  try {
    const foodTypes = await FoodType.findAll({
      attributes: ['id', 'nameEn', 'nameHr', 'icon'],
    });
    res.json(foodTypes);
  } catch (error) {
    console.error('Error fetching food types:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while fetching food types' });
  }
}

// Get all establishment types
async function getAllEstablishmentTypes(req, res) {
  try {
    const establishmentTypes = await EstablishmentType.findAll({
      attributes: ['id', 'nameEn', 'nameHr', 'icon'],
    });
    res.json(establishmentTypes);
  } catch (error) {
    console.error('Error fetching establishment types:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while fetching establishment types' });
  }
}

// Get all establishment perks
async function getAllEstablishmentPerks(req, res) {
  try {
    const establishmentPerks = await EstablishmentPerk.findAll({
      attributes: ['id', 'nameEn', 'nameHr', 'icon'],
    });
    res.json(establishmentPerks);
  } catch (error) {
    console.error('Error fetching establishment perks:', error);
    res.status(500).json({
      error: 'An error occurred while fetching establishment perks',
    });
  }
}

// Get all meal types
async function getAllMealTypes(req, res) {
  try {
    const mealTypes = await MealType.findAll({
      attributes: ['id', 'nameEn', 'nameHr', 'icon'],
    });
    res.json(mealTypes);
  } catch (error) {
    console.error('Error fetching meal types:', error);
    res.status(500).json({
      error: 'An error occurred while fetching meal types',
    });
  }
}

// Get all price categories
async function getAllPriceCategories(req, res) {
  try {
    const priceCategories = await PriceCategory.findAll({
      attributes: ['id', 'nameEn', 'nameHr', 'icon', 'level'],
    });
    res.json(priceCategories);
  } catch (error) {
    console.error('Error fetching price categories:', error);
    res.status(500).json({
      error: 'An error occurred while fetching price categories',
    });
  }
}

// Get all dietary types
async function getAllDietaryTypes(req, res) {
  try {
    const dietaryTypes = await DietaryType.findAll({
      attributes: ['id', 'nameEn', 'nameHr', 'icon'],
    });
    res.json(dietaryTypes);
  } catch (error) {
    console.error('Error fetching dietary types:', error);
    res.status(500).json({
      error: 'An error occurred while fetching dietary types',
    });
  }
}

module.exports = {
  getAllFoodTypes,
  getAllEstablishmentTypes,
  getAllEstablishmentPerks,
  getAllMealTypes,
  getAllPriceCategories,
  getAllDietaryTypes,
  // CRUD exported below
  createType,
  updateType,
  deleteType,
  updateTypeOrder,
};

// Generic CRUD helpers for sysadmin types
async function resolveModel(type) {
  switch (type) {
    case 'food-types':
      return FoodType;
    case 'establishment-types':
      return EstablishmentType;
    case 'establishment-perks':
      return EstablishmentPerk;
    case 'meal-types':
      return MealType;
    case 'dietary-types':
      return DietaryType;
    default:
      throw new Error('Unsupported type');
  }
}

async function createType(req, res) {
  try {
    const { type } = req.params;
    const Model = await resolveModel(type);
    const { nameEn, nameHr, icon } = req.body;
    if (!nameEn || !nameHr || !icon) {
      return res
        .status(400)
        .json({ message: 'nameEn, nameHr and icon are required' });
    }
    // position: append to end
    const last = await Model.findOne({ order: [['position', 'DESC']] });
    const position = (last?.position ?? -1) + 1;
    const created = await Model.create({ nameEn, nameHr, icon, position });
    res.status(201).json(created);
  } catch (err) {
    console.error('createType error', err);
    res.status(500).json({ message: 'Failed to create type' });
  }
}

async function updateType(req, res) {
  try {
    const { type, id } = req.params;
    const Model = await resolveModel(type);
    const { nameEn, nameHr, icon } = req.body;
    const item = await Model.findByPk(id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    await item.update({
      ...(nameEn !== undefined ? { nameEn } : {}),
      ...(nameHr !== undefined ? { nameHr } : {}),
      ...(icon !== undefined ? { icon } : {}),
    });
    res.json(item);
  } catch (err) {
    console.error('updateType error', err);
    res.status(500).json({ message: 'Failed to update type' });
  }
}

async function deleteType(req, res) {
  try {
    const { type, id } = req.params;
    const Model = await resolveModel(type);
    const item = await Model.findByPk(id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    await item.destroy();
    res.json({ success: true });
  } catch (err) {
    console.error('deleteType error', err);
    res.status(500).json({ message: 'Failed to delete type' });
  }
}

async function updateTypeOrder(req, res) {
  try {
    const { type } = req.params;
    const { order } = req.body; // array of ids in desired order
    if (!Array.isArray(order) || order.length === 0) {
      return res
        .status(400)
        .json({ message: 'order must be a non-empty array' });
    }
    const Model = await resolveModel(type);
    // Fetch all
    const items = await Model.findAll({ where: { id: order } });
    const idToItem = new Map(items.map((i) => [String(i.id), i]));
    // Apply positions based on order index
    let updated = [];
    for (let index = 0; index < order.length; index++) {
      const id = String(order[index]);
      const item = idToItem.get(id);
      if (!item) continue;
      if (item.position !== index) {
        await item.update({ position: index });
      }
      updated.push(item);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('updateTypeOrder error', err);
    res.status(500).json({ message: 'Failed to update type order' });
  }
}
