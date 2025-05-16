const express = require('express');
const {
  FoodType,
  EstablishmentType,
  EstablishmentPerk,
  MealType,
  PriceCategory,
  DietaryType,
} = require('../../../models');

const router = express.Router();

// Get all types for filtering in a single request
router.get('/types/all', async (req, res) => {
  try {
    const [
      foodTypes,
      establishmentTypes,
      establishmentPerks,
      mealTypes,
      priceCategories,
      dietaryTypes,
    ] = await Promise.all([
      FoodType.findAll(),
      EstablishmentType.findAll(),
      EstablishmentPerk.findAll(),
      MealType.findAll(),
      PriceCategory.findAll(),
      DietaryType.findAll(),
    ]);

    res.json({
      foodTypes,
      establishmentTypes,
      establishmentPerks,
      mealTypes,
      priceCategories,
      dietaryTypes,
    });
  } catch (error) {
    console.error('Error fetching types:', error);
    res.status(500).json({ error: 'Failed to fetch types' });
  }
});

module.exports = router;
