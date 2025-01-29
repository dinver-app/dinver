const { FoodType, VenuePerks } = require('../../models');

// Get all food types
async function getAllFoodTypes(req, res) {
  try {
    const foodTypes = await FoodType.findAll();
    res.json(foodTypes);
  } catch (error) {
    console.error('Error fetching food types:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while fetching food types' });
  }
}

// Get all venue types
async function getAllVenuePerks(req, res) {
  try {
    const venuePerks = await VenuePerks.findAll();
    res.json(venuePerks);
  } catch (error) {
    console.error('Error fetching venue perks:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while fetching venue perks' });
  }
}

module.exports = {
  getAllFoodTypes,
  getAllVenuePerks,
};
