const {
  FoodType,
  EstablishmentType,
  EstablishmentPerk,
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

module.exports = {
  getAllFoodTypes,
  getAllEstablishmentTypes,
  getAllEstablishmentPerks,
};
