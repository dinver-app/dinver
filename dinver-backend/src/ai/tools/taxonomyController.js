const {
  Allergen,
  MealType,
  DietaryType,
  EstablishmentPerk,
  EstablishmentType,
  FoodType,
  PriceCategory,
} = require('../../../models');

const TABLES = {
  allergens: Allergen,
  mealTypes: MealType,
  dietaryTypes: DietaryType,
  establishmentPerks: EstablishmentPerk,
  establishmentTypes: EstablishmentType,
  foodTypes: FoodType,
  priceCategories: PriceCategory,
};

let taxonomiesCache = null;
let cacheExpiry = null;
const CACHE_DURATION = 30 * 60 * 1000;

async function getAllTaxonomies(Model) {
  return await Model.findAll({
    attributes: ['id', 'nameEn', 'nameHr'],
    order: [['id', 'ASC']],
  });
}

async function loadAllTaxonomies() {
  const out = {};
  await Promise.all(
    Object.entries(TABLES).map(async ([key, Model]) => {
      out[key] = await getAllTaxonomies(Model);
    }),
  );
  return out;
}

exports.getTaxonomies = async (req, res) => {
  try {
    const now = Date.now();

    if (!taxonomiesCache || !cacheExpiry || now > cacheExpiry) {
      taxonomiesCache = await loadAllTaxonomies();
      cacheExpiry = now + CACHE_DURATION;
    }

    return res.json({ ok: true, result: taxonomiesCache });
  } catch (e) {
    console.error('resolveTaxonomies error', e);
    res.status(500).json({ error: 'Failed to resolve taxonomies' });
  }
};
