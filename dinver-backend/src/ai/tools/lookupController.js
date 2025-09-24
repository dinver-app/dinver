const {
  Allergen,
  MealType,
  DietaryType,
  EstablishmentPerk,
  EstablishmentType,
  FoodType,
  PriceCategory,
} = require('../../../models');
const { Op } = require('sequelize');

const searchAllergensByName = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim() === '')
      return res.status(400).json({ error: 'Query parameter is required' });

    const allergens = await Allergen.findAll({
      where: {
        [Op.or]: [
          { nameEn: { [Op.iLike]: `%${query}%` } },
          { nameHr: { [Op.iLike]: `%${query}%` } },
        ],
      },
      order: [['id', 'ASC']],
    });

    res.json(allergens);
  } catch (error) {
    console.error('Failed to search allergens:', error);
    res.status(500).json({ error: 'Failed to search allergens' });
  }
};
const searchMealTypesByName = async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res
        .status(400)
        .json({ error: 'Query parameter "name" is required' });
    }

    const mealTypes = await MealType.findAll({
      where: {
        [Op.or]: [
          { nameEn: { [Op.iLike]: `%${name}%` } },
          { nameHr: { [Op.iLike]: `%${name}%` } },
        ],
      },
      attributes: ['id', 'nameEn', 'nameHr', 'icon'],
    });

    res.json(mealTypes);
  } catch (error) {
    console.error('Error searching meal types by name:', error);
    res.status(500).json({ error: 'Failed to search meal types' });
  }
};

const searchDietaryTypesByName = async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res
        .status(400)
        .json({ error: 'Query parameter "name" is required' });
    }

    const dietaryTypes = await DietaryType.findAll({
      where: {
        [Op.or]: [
          { nameEn: { [Op.iLike]: `%${name}%` } },
          { nameHr: { [Op.iLike]: `%${name}%` } },
        ],
      },
      attributes: ['id', 'nameEn', 'nameHr', 'icon'],
    });

    res.json(dietaryTypes);
  } catch (error) {
    console.error('Error searching dietary types by name:', error);
    res.status(500).json({ error: 'Failed to search dietary types' });
  }
};
const searchEstablishmentPerksByName = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res
        .status(400)
        .json({ error: 'Query parameter "name" is required' });
    }

    const perks = await EstablishmentPerk.findAll({
      where: {
        [Op.or]: [
          { nameEn: { [Op.iLike]: `%${name}%` } },
          { nameHr: { [Op.iLike]: `%${name}%` } },
        ],
      },
      attributes: ['id', 'nameEn', 'nameHr', 'icon'],
    });

    res.json(perks);
  } catch (error) {
    console.error('Error searching establishment perks by name:', error);
    res.status(500).json({ error: 'Failed to search establishment perks' });
  }
};
const searchEstablishmentTypesByName = async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res
        .status(400)
        .json({ error: 'Query parameter "name" is required' });
    }

    const establishmentTypes = await EstablishmentType.findAll({
      where: {
        [Op.or]: [
          { nameEn: { [Op.iLike]: `%${name}%` } },
          { nameHr: { [Op.iLike]: `%${name}%` } },
        ],
      },
      attributes: ['id', 'nameEn', 'nameHr', 'icon'],
    });

    res.json(establishmentTypes);
  } catch (error) {
    console.error('Error searching establishment types by name:', error);
    res.status(500).json({ error: 'Failed to search establishment types' });
  }
};

const searchFoodTypesByName = async (req, res) => {
  try {
    const name = (req.query.name || '').trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);

    if (!name) {
      return res
        .status(400)
        .json({ error: 'Query parameter "name" is required' });
    }

    const foodTypes = await FoodType.findAll({
      where: {
        [Op.or]: [
          { nameEn: { [Op.iLike]: `%${name}%` } },
          { nameHr: { [Op.iLike]: `%${name}%` } },
        ],
      },
      attributes: ['id', 'nameEn', 'nameHr', 'icon'],
      order: [['id', 'ASC']],
      limit,
    });

    res.json(foodTypes);
  } catch (error) {
    console.error('Error searching food types by name:', error);
    res.status(500).json({ error: 'Failed to search food types' });
  }
};

const searchPriceCategoriesByName = async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res
        .status(400)
        .json({ error: 'Query parameter "name" is required' });
    }

    const priceCategories = await PriceCategory.findAll({
      where: {
        [Op.or]: [
          { nameEn: { [Op.iLike]: `%${name}%` } },
          { nameHr: { [Op.iLike]: `%${name}%` } },
        ],
      },
      attributes: ['id', 'nameEn', 'nameHr', 'icon', 'level'],
    });

    res.json(priceCategories);
  } catch (error) {
    console.error('Error searching price categories by name:', error);
    res.status(500).json({ error: 'Failed to search price categories' });
  }
};

module.exports = {
  searchAllergensByName,
  searchMealTypesByName,
  searchDietaryTypesByName,
  searchEstablishmentPerksByName,
  searchEstablishmentTypesByName,
  searchFoodTypesByName,
  searchPriceCategoriesByName,
};
