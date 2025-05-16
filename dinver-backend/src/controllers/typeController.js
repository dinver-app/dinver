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
};
