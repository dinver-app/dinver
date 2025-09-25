const { Op } = require('sequelize');
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

function norm(s) {
  return (s || '').toString().trim();
}

async function findManyByNames(Model, names) {
  const q = names.filter(Boolean).map(norm).filter(Boolean);
  if (!q.length) return [];

  const ors = q.flatMap((name) => [
    { nameEn: { [Op.iLike]: `%${name}%` } },
    { nameHr: { [Op.iLike]: `%${name}%` } },
  ]);

  const rows = await Model.findAll({
    where: { [Op.or]: ors },
    attributes: ['id', 'nameEn', 'nameHr', 'icon'],
    order: [['id', 'ASC']],
    limit: 200,
  });

  const byQuery = {};
  for (const name of q) {
    const matches = rows.filter(
      (r) =>
        (r.nameEn && r.nameEn.toLowerCase().includes(name.toLowerCase())) ||
        (r.nameHr && r.nameHr.toLowerCase().includes(name.toLowerCase())),
    );
    byQuery[name] = matches;
  }
  return byQuery;
}

/**
 * Body:
 * {
 *   allergens?: string[],
 *   mealTypes?: string[],
 *   dietaryTypes?: string[],
 *   establishmentPerks?: string[],
 *   establishmentTypes?: string[],
 *   foodTypes?: string[],
 *   priceCategories?: string[]
 * }
 */
exports.resolveTaxonomies = async (req, res) => {
  try {
    const body = req.body || {};
    const out = {};

    await Promise.all(
      Object.entries(TABLES).map(async ([key, Model]) => {
        const list = Array.isArray(body[key]) ? body[key] : [];
        out[key] = await findManyByNames(Model, list);
      }),
    );

    return res.json({ ok: true, result: out });
  } catch (e) {
    console.error('resolveTaxonomies error', e);
    res.status(500).json({ error: 'Failed to resolve taxonomies' });
  }
};
