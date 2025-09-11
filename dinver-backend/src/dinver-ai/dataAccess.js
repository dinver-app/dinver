'use strict';
const { Op, Sequelize } = require('sequelize');
const {
  Restaurant,
  MenuItem,
  MenuItemTranslation,
  DrinkItem,
  DrinkItemTranslation,
  PriceCategory,
  Review,
  FoodType,
  EstablishmentType,
  EstablishmentPerk,
  MealType,
  DietaryType,
} = require('../../models');
function pickNameByLang(translations = [], preferLang = 'hr') {
  const preferred = translations.find((t) => t.language === preferLang)?.name;
  if (preferred) return preferred;
  const fallback = translations.find(
    (t) => t.language && t.language !== preferLang,
  )?.name;
  return fallback || translations[0]?.name || '';
}

const { calculateDistance } = require('../../utils/distance');

// ---- Simple in-memory cache for type lookups (5 min) ----
const TYPES_TTL_MS = 5 * 60 * 1000;
const typesCache = new Map(); // key: restaurantId -> { data, expiresAt }
function getCachedTypes(restaurantId) {
  const e = typesCache.get(restaurantId);
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    typesCache.delete(restaurantId);
    return null;
  }
  return e.data;
}
function setCachedTypes(restaurantId, data) {
  typesCache.set(restaurantId, { data, expiresAt: Date.now() + TYPES_TTL_MS });
}

// ---- Cache for all EstablishmentPerks (10 min) ----
const PERKS_TTL_MS = 10 * 60 * 1000;
let perksCache = { data: null, expiresAt: 0 };
async function getAllPerksCached() {
  const now = Date.now();
  if (perksCache.data && perksCache.expiresAt > now) return perksCache.data;
  const rows = await EstablishmentPerk.findAll({
    attributes: ['id', 'nameEn', 'nameHr', 'icon'],
  });
  const list = rows.map((r) => (r.get ? r.get() : r));
  perksCache = { data: list, expiresAt: now + PERKS_TTL_MS };
  return list;
}

function normalizeText(s) {
  return (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Very small synonyms map for frequent queries
const PERK_SYNONYMS = new Map([
  ['terasa', 'outdoor seating'],
  ['vanjska terasa', 'outdoor seating'],
  ['terrace', 'outdoor seating'],
  ['outdoor', 'outdoor seating'],
  // credit cards
  ['kartica', 'accepts credit cards'],
  ['kartice', 'accepts credit cards'],
  ['karticom', 'accepts credit cards'],
  ['kreditna kartica', 'accepts credit cards'],
  ['kreditne kartice', 'accepts credit cards'],
  ['placanje karticom', 'accepts credit cards'],
  ['plaćanje karticom', 'accepts credit cards'],
  ['credit card', 'accepts credit cards'],
  ['credit cards', 'accepts credit cards'],
]);

async function resolvePerkIdByName(query) {
  const normalized = normalizeText(query);
  if (!normalized) return null;
  const perks = await getAllPerksCached();

  const canonical = PERK_SYNONYMS.get(normalized) || normalized;
  console.log(
    '[AI][perk-resolver] input=',
    normalized,
    'canonical=',
    canonical,
  );

  let best = null;
  let bestScore = 0;
  for (const p of perks) {
    const hr = normalizeText(p.nameHr);
    const en = normalizeText(p.nameEn);
    let score = 0;
    if (hr === canonical || en === canonical) score = 100;
    else if (hr.includes(canonical) || en.includes(canonical)) score = 80;
    else {
      const roots = [canonical.slice(0, 6), normalized.slice(0, 6)];
      if (roots.some((r) => r && (hr.includes(r) || en.includes(r))))
        score = 60;
      // credit heuristics
      if (
        (normalized.includes('kartic') || normalized.includes('credit')) &&
        (en.includes('accepts credit cards') ||
          hr.includes('mogucnost placanja kreditnom karticom') ||
          hr.includes('pla')) /* plaćanje */
      )
        score = Math.max(score, 90);
    }
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  console.log('[AI][perk-resolver] best=', best, 'score=', bestScore);
  return bestScore > 0 ? best : null;
}

async function fetchPartnersBasic() {
  const partners = await Restaurant.findAll({
    where: { isClaimed: true },
    attributes: [
      'id',
      'name',
      'address',
      'place',
      'latitude',
      'longitude',
      'phone',
      'rating',
      'priceLevel',
      'slug',
      'thumbnailUrl',
      'isClaimed',
    ],
    order: [Sequelize.fn('RANDOM')],
  });
  return partners.map((r) => (r.get ? r.get() : r));
}

async function fetchRestaurantDetails(id) {
  // Include priceCategory and translations to build description
  const restaurant = await Restaurant.findOne({
    where: { id, isClaimed: true },
    include: [
      {
        model: PriceCategory,
        as: 'priceCategory',
        attributes: ['id', 'nameEn', 'nameHr', 'icon', 'level'],
      },
      {
        model: require('../../models').RestaurantTranslation,
        as: 'translations',
      },
    ],
    attributes: [
      'id',
      'name',
      'address',
      'place',
      'latitude',
      'longitude',
      'phone',
      'rating',
      'userRatingsTotal',
      'priceLevel',
      'thumbnailUrl',
      'slug',
      'isClaimed',
      'foodTypes',
      'establishmentTypes',
      'establishmentPerks',
      'mealTypes',
      'dietaryTypes',
      'priceCategoryId',
      'reservationEnabled',
      'websiteUrl',
      'fbUrl',
      'igUrl',
      'ttUrl',
      'email',
      'images',
      'openingHours',
      'customWorkingDays',
      'subdomain',
      'virtualTourUrl',
    ],
  });
  if (!restaurant) return null;
  const obj = restaurant.get ? restaurant.get() : restaurant;
  // Build description from translations if available
  if (obj.translations && Array.isArray(obj.translations)) {
    const hr = obj.translations.find((t) => t.language === 'hr');
    const en = obj.translations.find((t) => t.language === 'en');
    obj.description = {
      hr: hr?.description || '',
      en: en?.description || '',
    };
    delete obj.translations;
  }
  return obj;
}

async function searchMenuAcrossRestaurants(term) {
  if (!term) return [];
  const like = `%${term}%`;
  // Find item translations first (both menu and drink) for partner restaurants only
  const [menuTranslations, drinkTranslations] = await Promise.all([
    MenuItemTranslation.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: like } },
          { description: { [Op.iLike]: like } },
        ],
      },
      include: [
        { model: MenuItem, as: 'menuItem', attributes: ['id', 'restaurantId'] },
      ],
      limit: 100,
    }),
    DrinkItemTranslation.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: like } },
          { description: { [Op.iLike]: like } },
        ],
      },
      include: [
        {
          model: DrinkItem,
          as: 'drinkItem',
          attributes: ['id', 'restaurantId'],
        },
      ],
      limit: 100,
    }),
  ]);

  const restaurantIds = new Set();
  menuTranslations.forEach(
    (t) => t.menuItem && restaurantIds.add(t.menuItem.restaurantId),
  );
  drinkTranslations.forEach(
    (t) => t.drinkItem && restaurantIds.add(t.drinkItem.restaurantId),
  );

  if (restaurantIds.size === 0) return [];
  const restaurants = await Restaurant.findAll({
    where: { id: { [Op.in]: Array.from(restaurantIds) }, isClaimed: true },
    attributes: [
      'id',
      'name',
      'place',
      'slug',
      'latitude',
      'longitude',
      'priceCategoryId',
    ],
    include: [
      {
        model: PriceCategory,
        as: 'priceCategory',
        attributes: ['nameEn', 'nameHr', 'level', 'icon'],
      },
    ],
  });
  const byId = new Map(restaurants.map((r) => [r.id, r.get ? r.get() : r]));

  const results = [];
  const pushUnique = (arr, rec, key) => {
    if (
      !arr.some(
        (x) => x[key] === rec[key] && x.restaurant.id === rec.restaurant.id,
      )
    ) {
      arr.push(rec);
    }
  };
  menuTranslations.forEach((t) => {
    const rest = t.menuItem ? byId.get(t.menuItem.restaurantId) : null;
    if (rest)
      pushUnique(
        results,
        {
          type: 'food',
          restaurant: rest,
          name: t.name,
          menuItemId: t.menuItemId,
        },
        'menuItemId',
      );
  });
  drinkTranslations.forEach((t) => {
    const rest = t.drinkItem ? byId.get(t.drinkItem.restaurantId) : null;
    if (rest)
      pushUnique(
        results,
        {
          type: 'drink',
          restaurant: rest,
          name: t.name,
          drinkItemId: t.drinkItemId,
        },
        'drinkItemId',
      );
  });
  // Remove helper ids before returning
  return results.map(({ menuItemId, drinkItemId, ...rest }) => rest);
}

function normalizeMenuTerm(s) {
  return (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function buildMenuLikeVariants(term) {
  const t = normalizeMenuTerm(term);
  if (!t) return [];
  const variants = new Set();
  variants.add(`%${t}%`);
  // simple stemming: drop trailing vowels or common suffixes
  if (t.length >= 4) {
    variants.add(`%${t.slice(0, t.length - 1)}%`);
    variants.add(`%${t.slice(0, t.length - 2)}%`);
  }
  // handle pizza/pizzu/pizze/pice/pica
  if (t.startsWith('pizz')) variants.add('%pizz%');
  if (t.startsWith('piz')) variants.add('%piz%');
  if (t === 'pizza') variants.add('%pica%');
  if (t === 'pica') variants.add('%pizza%');
  return Array.from(variants);
}

async function searchMenuForRestaurant(restaurantId, term, preferLang = 'hr') {
  if (!restaurantId || !term) return [];
  const likes = buildMenuLikeVariants(term);
  const [menuTranslations, drinkTranslations] = await Promise.all([
    MenuItemTranslation.findAll({
      where: {
        [Op.or]: likes
          .map((l) => ({ name: { [Op.iLike]: l } }))
          .concat(likes.map((l) => ({ description: { [Op.iLike]: l } }))),
      },
      include: [
        {
          model: MenuItem,
          as: 'menuItem',
          attributes: ['id', 'restaurantId', 'price'],
          where: { restaurantId },
          required: true,
        },
      ],
      attributes: ['name', 'language'],
      limit: 50,
    }),
    DrinkItemTranslation.findAll({
      where: {
        [Op.or]: likes
          .map((l) => ({ name: { [Op.iLike]: l } }))
          .concat(likes.map((l) => ({ description: { [Op.iLike]: l } }))),
      },
      include: [
        {
          model: DrinkItem,
          as: 'drinkItem',
          attributes: ['id', 'restaurantId', 'price'],
          where: { restaurantId },
          required: true,
        },
      ],
      attributes: ['name', 'language'],
      limit: 50,
    }),
  ]);
  const foodsById = new Map();
  for (const t of menuTranslations) {
    const id = t.menuItem?.id;
    if (!id) continue;
    const candidate = {
      type: 'food',
      name: t.name,
      price: t.menuItem?.price || null,
      lang: t.language,
    };
    const current = foodsById.get(id);
    if (
      !current ||
      (t.language === preferLang && current.lang !== preferLang)
    ) {
      foodsById.set(id, candidate);
    }
  }

  const drinksById = new Map();
  for (const t of drinkTranslations) {
    const id = t.drinkItem?.id;
    if (!id) continue;
    const candidate = {
      type: 'drink',
      name: t.name,
      price: t.drinkItem?.price || null,
      lang: t.language,
    };
    const current = drinksById.get(id);
    if (
      !current ||
      (t.language === preferLang && current.lang !== preferLang)
    ) {
      drinksById.set(id, candidate);
    }
  }
  return [...foodsById.values(), ...drinksById.values()].map(
    ({ lang, ...rest }) => rest,
  );
}

async function findMostExpensiveItemsForRestaurant(
  restaurantId,
  preferLang = 'hr',
) {
  const [foods, drinks] = await Promise.all([
    MenuItem.findAll({
      where: { restaurantId, price: { [Op.ne]: null } },
      attributes: ['id', 'price'],
      include: [
        {
          model: MenuItemTranslation,
          as: 'translations',
          attributes: ['language', 'name'],
        },
      ],
    }),
    DrinkItem.findAll({
      where: { restaurantId, price: { [Op.ne]: null } },
      attributes: ['id', 'price'],
      include: [
        {
          model: DrinkItemTranslation,
          as: 'translations',
          attributes: ['language', 'name'],
        },
      ],
    }),
  ]);

  const items = [];
  for (const m of foods) {
    const obj = m.get ? m.get() : m;
    items.push({
      type: 'food',
      id: obj.id,
      name: pickNameByLang(obj.translations || [], preferLang),
      price: Number(obj.price),
    });
  }
  for (const d of drinks) {
    const obj = d.get ? d.get() : d;
    items.push({
      type: 'drink',
      id: obj.id,
      name: pickNameByLang(obj.translations || [], preferLang),
      price: Number(obj.price),
    });
  }

  if (items.length === 0) return { maxPrice: null, items: [] };
  const maxPrice = Math.max(...items.map((i) => i.price || 0));
  return { maxPrice, items: items.filter((i) => i.price === maxPrice) };
}

async function findNearbyPartners({
  latitude,
  longitude,
  radiusKm = 10,
  limit = 10,
}) {
  const partners = await fetchPartnersBasic();
  if (typeof latitude === 'undefined' || typeof longitude === 'undefined')
    return [];
  const lat = Number(latitude);
  const lon = Number(longitude);
  const filtered = partners
    .map((r) => ({
      ...r,
      distanceKm: calculateDistance(
        lat,
        lon,
        Number(r.latitude),
        Number(r.longitude),
      ),
    }))
    .filter((r) => r.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
  return filtered;
}

async function fetchTypesForRestaurant(restaurant) {
  // Try cache first
  const cached = getCachedTypes(restaurant.id);
  if (cached) return cached;

  const [
    foodTypes,
    establishmentTypes,
    establishmentPerks,
    mealTypes,
    dietaryTypes,
  ] = await Promise.all([
    FoodType.findAll({
      where: { id: { [Op.in]: restaurant.foodTypes || [] } },
      attributes: ['id', 'nameEn', 'nameHr', 'icon'],
    }),
    EstablishmentType.findAll({
      where: { id: { [Op.in]: restaurant.establishmentTypes || [] } },
      attributes: ['id', 'nameEn', 'nameHr', 'icon'],
    }),
    EstablishmentPerk.findAll({
      where: { id: { [Op.in]: restaurant.establishmentPerks || [] } },
      attributes: ['id', 'nameEn', 'nameHr', 'icon'],
    }),
    MealType.findAll({
      where: { id: { [Op.in]: restaurant.mealTypes || [] } },
      attributes: ['id', 'nameEn', 'nameHr', 'icon'],
    }),
    DietaryType.findAll({
      where: { id: { [Op.in]: restaurant.dietaryTypes || [] } },
      attributes: ['id', 'nameEn', 'nameHr', 'icon'],
    }),
  ]);
  const data = {
    foodTypes: foodTypes.map((t) => (t.get ? t.get() : t)),
    establishmentTypes: establishmentTypes.map((t) => (t.get ? t.get() : t)),
    establishmentPerks: establishmentPerks.map((t) => (t.get ? t.get() : t)),
    mealTypes: mealTypes.map((t) => (t.get ? t.get() : t)),
    dietaryTypes: dietaryTypes.map((t) => (t.get ? t.get() : t)),
  };
  setCachedTypes(restaurant.id, data);
  return data;
}

async function fetchReviewsSummary(restaurantId) {
  const reviews = await Review.findAll({
    where: { restaurantId, isHidden: false },
  });
  const ratings = { overall: 0, foodQuality: 0, service: 0, atmosphere: 0 };
  if (reviews.length > 0) {
    const sums = reviews.reduce(
      (acc, r) => ({
        rating: acc.rating + (r.rating || 0),
        foodQuality: acc.foodQuality + (r.foodQuality || 0),
        service: acc.service + (r.service || 0),
        atmosphere: acc.atmosphere + (r.atmosphere || 0),
      }),
      { rating: 0, foodQuality: 0, service: 0, atmosphere: 0 },
    );
    ratings.overall = Number((sums.rating / reviews.length).toFixed(2));
    ratings.foodQuality = Number(
      (sums.foodQuality / reviews.length).toFixed(2),
    );
    ratings.service = Number((sums.service / reviews.length).toFixed(2));
    ratings.atmosphere = Number((sums.atmosphere / reviews.length).toFixed(2));
  }
  return { ratings, totalReviews: reviews.length };
}

module.exports = {
  fetchPartnersBasic,
  fetchRestaurantDetails,
  searchMenuAcrossRestaurants,
  searchMenuForRestaurant,
  findNearbyPartners,
  fetchTypesForRestaurant,
  fetchReviewsSummary,
  getAllPerksCached,
  resolvePerkIdByName,
  findMostExpensiveItemsForRestaurant,
};
