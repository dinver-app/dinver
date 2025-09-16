'use strict';
const { Op, Sequelize } = require('sequelize');
const { getMediaUrl } = require('../../config/cdn');

// Helper funkcija za normalizaciju teksta
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Ukloni dijakritike
    .replace(/[^\w\s]/g, '') // Ukloni interpunkciju
    .trim();
}

// Enhanced food synonyms map for better menu search
const FOOD_SYNONYMS = new Map([
  // Vegan/Vegetarian/Gluten-free variations
  ['vegan', ['vegan', 'vegan meal', 'vegan food', 'vegan options', 'veganski', 'vegan obrok', 'veganska jela', 'veganske opcije']],
  ['vegetarian', ['vegetarian', 'vegetarian meal', 'vegetarian food', 'vegetarijan', 'vegetarijanski', 'vegetarijanska jela', 'vegetarijanske opcije']],
  ['gluten-free', ['gluten-free', 'gluten free', 'glutenfree', 'bez glutena', 'bezglutensko', 'bezglutenska jela', 'bezglutenske opcije']],
  ['halal', ['halal', 'halal meal', 'halal food', 'halal opcije']],
  // Breakfast/Lunch/Dinner/Brunch
  ['breakfast', ['breakfast', 'doručak', 'dorucak']],
  ['lunch', ['lunch', 'ručak', 'rucak']],
  ['dinner', ['dinner', 'večera', 'vecera']],
  ['brunch', ['brunch', 'brunch obrok']],
  // Pizza variations
  ['pizza', ['pizza', 'pizz', 'pica', 'pizze', 'pizzu', 'pice', 'picu']],
  ['pizze', ['pizza', 'pizz', 'pica', 'pizze', 'pizzu', 'pice', 'picu']],
  ['pica', ['pizza', 'pizz', 'pica', 'pizze', 'pizzu', 'pice', 'picu']],
  
  // Burger variations
  ['burger', ['burger', 'hamburger', 'burgeri', 'hamburgeri', 'sendvič', 'sendvic']],
  ['hamburger', ['burger', 'hamburger', 'burgeri', 'hamburgeri', 'sendvič', 'sendvic']],
  
  // Ćevapi variations
  ['cevap', ['cevap', 'cevapi', 'ćevap', 'ćevapi', 'cevape', 'ćevape']],
  ['cevapi', ['cevap', 'cevapi', 'ćevap', 'ćevapi', 'cevape', 'ćevape']],
  ['ćevapi', ['cevap', 'cevapi', 'ćevap', 'ćevapi', 'cevape', 'ćevape']],
  
  // Lasagna variations
  ['lazanj', ['lazanj', 'lazanja', 'lazanje', 'lasagna', 'lasagne']],
  ['lazanje', ['lazanj', 'lazanja', 'lazanje', 'lasagna', 'lasagne']],
  ['lasagna', ['lazanj', 'lazanja', 'lazanje', 'lasagna', 'lasagne']],
  
  // Pasta variations
  ['pasta', ['pasta', 'paste', 'tjestenina', 'tjestenine']],
  ['tjestenina', ['pasta', 'paste', 'tjestenina', 'tjestenine']],
  
  // Salad variations
  ['salata', ['salata', 'salate', 'salatu', 'salad']],
  ['salate', ['salata', 'salate', 'salatu', 'salad']],
  ['salad', ['salata', 'salate', 'salatu', 'salad']],
  
  // Soup variations
  ['juha', ['juha', 'juhe', 'juhu', 'supa', 'supu', 'soup']],
  ['supa', ['juha', 'juhe', 'juhu', 'supa', 'supu', 'soup']],
  ['soup', ['juha', 'juhe', 'juhu', 'supa', 'supu', 'soup']],
  
  // Meat variations
  ['meso', ['meso', 'mesa', 'meat', 'biftek', 'odrezak', 'steak']],
  ['biftek', ['meso', 'mesa', 'meat', 'biftek', 'odrezak', 'steak']],
  ['steak', ['meso', 'mesa', 'meat', 'biftek', 'odrezak', 'steak']],
  
  // Chicken variations
  ['piletina', ['piletina', 'pileća', 'pilece', 'chicken']],
  ['chicken', ['piletina', 'pileća', 'pilece', 'chicken']],
  
  // Fish variations
  ['riba', ['riba', 'ribe', 'ribu', 'fish']],
  ['fish', ['riba', 'ribe', 'ribu', 'fish']],
  
  // Seafood variations
  ['morski plodovi', ['morski plodovi', 'seafood', 'plodovi mora']],
  ['seafood', ['morski plodovi', 'seafood', 'plodovi mora']],
  
  // Dessert variations
  ['desert', ['desert', 'deserti', 'dessert', 'slastice', 'slastica']],
  ['dessert', ['desert', 'deserti', 'dessert', 'slastice', 'slastica']],
  ['slastice', ['desert', 'deserti', 'dessert', 'slastice', 'slastica']],
  
  // Pancakes variations
  ['palačinke', ['palačinke', 'palačinka', 'palacinke', 'pancakes', 'pancake']],
  ['pancakes', ['palačinke', 'palačinka', 'palacinke', 'pancakes', 'pancake']],
  
  // Coffee variations
  ['kava', ['kava', 'kave', 'kavu', 'kafi', 'coffee']],
  ['coffee', ['kava', 'kave', 'kavu', 'kafi', 'coffee']],
  
  // Beer variations
  ['pivo', ['pivo', 'piva', 'pive', 'beer']],
  ['beer', ['pivo', 'piva', 'pive', 'beer']],
  
  // Wine variations
  ['vino', ['vino', 'vina', 'vine', 'wine']],
  ['wine', ['vino', 'vina', 'vine', 'wine']],
  
  // Rice variations
  ['riža', ['riža', 'riže', 'rižu', 'rice']],
  ['rice', ['riža', 'riže', 'rižu', 'rice']],
]);

// Enhanced search function with synonyms
function createEnhancedSearchVariations(term) {
  if (!term) return [];

  const normalized = normalizeText(term);
  const variations = new Set([normalized]);

  // Add synonyms from map
  for (const [key, synonyms] of FOOD_SYNONYMS) {
    if (normalizeText(key) === normalized || synonyms.some(s => normalizeText(s) === normalized)) {
      synonyms.forEach(s => variations.add(normalizeText(s)));
    }
  }

  // Original plural/singular logic
  if (normalized.endsWith('i')) {
    variations.add(normalized.slice(0, -1)); // burgeri → burger
  }
  if (normalized.endsWith('e')) {
    variations.add(normalized.slice(0, -1)); // pizze → pizz
    variations.add(normalized.slice(0, -1) + 'a'); // pizze → pizza
  }
  if (
    !normalized.endsWith('a') &&
    !normalized.endsWith('e') &&
    !normalized.endsWith('i')
  ) {
    variations.add(normalized + 'a'); // pizz → pizza
    variations.add(normalized + 'i'); // burger → burgeri
  }

  return Array.from(variations);
}
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
  // Outdoor Seating
  ['terasa', 'outdoor seating'],
  ['vanjska terasa', 'outdoor seating'],
  ['terrace', 'outdoor seating'],
  ['outdoor', 'outdoor seating'],

  // Rooftop View
  ['krovna terasa', 'rooftop view'],
  ['krovna terasa s pogledom', 'rooftop view'],
  ['rooftop view', 'rooftop view'],
  ['rooftop', 'rooftop view'],

  // Beachfront
  ['prvi red do mora', 'beachfront'],
  ['beachfront', 'beachfront'],
  ['mora', 'beachfront'],

  // Themed Establishment
  ['tematski objekt', 'themed establishment'],
  ['themed establishment', 'themed establishment'],
  ['themed', 'themed establishment'],

  // Public Transport
  ['javnog prijevoza', 'close to public transport'],
  ['public transport', 'close to public transport'],
  ['transport', 'close to public transport'],

  // Open Late Night
  ['kasno u noć', 'open late-night'],
  ['kasno', 'open late-night'],
  ['late night', 'open late-night'],
  ['late-night', 'open late-night'],

  // 24/7 Open
  ['0-24', '24/7 open'],
  ['24/7', '24/7 open'],
  ['nonstop', '24/7 open'],

  // Reservations Recommended
  ['preporučeno rezervirati', 'reservations recommended'],
  ['reservations recommended', 'reservations recommended'],
  ['rezervirati', 'reservations recommended'],

  // Credit Cards
  ['kartica', 'accepts credit cards'],
  ['kartice', 'accepts credit cards'],
  ['karticom', 'accepts credit cards'],
  ['kreditna kartica', 'accepts credit cards'],
  ['kreditne kartice', 'accepts credit cards'],
  ['placanje karticom', 'accepts credit cards'],
  ['plaćanje karticom', 'accepts credit cards'],
  ['credit card', 'accepts credit cards'],
  ['credit cards', 'accepts credit cards'],

  // Free Wi-Fi
  ['besplatan wi-fi', 'free wi-fi'],
  ['free wi-fi', 'free wi-fi'],
  ['wifi', 'free wi-fi'],
  ['wi-fi', 'free wi-fi'],

  // Takeaway
  ['hranu za van', 'takeaway available'],
  ['takeaway', 'takeaway available'],
  ['za van', 'takeaway available'],

  // Coffee To Go
  ['kavu za van', 'coffee to go available'],
  ['coffee to go', 'coffee to go available'],
  ['kava za van', 'coffee to go available'],

  // Quick Bites
  ['brze zalogaje', 'quick bites'],
  ['quick bites', 'quick bites'],
  ['brzo', 'quick bites'],

  // Play Areas
  ['igrališta', 'play areas'],
  ['play areas', 'play areas'],
  ['igralište', 'play areas'],

  // Children Menu
  ['jelovnik za djecu', 'childrens menu'],
  ['children menu', 'childrens menu'],
  ['childrens menu', 'childrens menu'],
  ['djecu', 'childrens menu'],

  // Pet Friendly
  ['kućne ljubimce', 'pet-friendly'],
  ['pet friendly', 'pet-friendly'],
  ['pet-friendly', 'pet-friendly'],
  ['ljubimce', 'pet-friendly'],

  // Live Music
  ['glazbu uživo', 'live music'],
  ['live music', 'live music'],
  ['uživo', 'live music'],

  // Karaoke
  ['karaoke', 'karaoke'],

  // Sports Bar
  ['sportski bar', 'sports bar'],
  ['sports bar', 'sports bar'],
  ['sportski', 'sports bar'],

  // Spicy Food
  ['ljutu hranu', 'spicy food lovers'],
  ['spicy food', 'spicy food lovers'],
  ['ljuto', 'spicy food lovers'],

  // Buffet
  ['all-you-can-eat buffet', 'all-you-can-eat buffet'],
  ['buffet', 'all-you-can-eat buffet'],

  // Signature Desserts
  ['prepoznatljive deserte', 'signature desserts'],
  ['signature desserts', 'signature desserts'],
  ['deserte', 'signature desserts'],

  // Michelin Star
  ['michelinovu zvjezdicu', 'michelin-starred restaurant'],
  ['michelin starred', 'michelin-starred restaurant'],
  ['michelin', 'michelin-starred restaurant'],

  // Free Parking
  ['besplatni parking', 'free parking'],
  ['free parking', 'free parking'],
  ['parking', 'free parking'],

  // Paid Parking
  ['plaćeni parking', 'paid parking'],
  ['paid parking', 'paid parking'],

  // Air Conditioned
  ['klimatiziran prostor', 'air-conditioned space'],
  ['air conditioned', 'air-conditioned space'],
  ['klima', 'air-conditioned space'],

  // High Chairs
  ['stolice za djecu', 'high chairs available'],
  ['high chairs', 'high chairs available'],
  ['stolice', 'high chairs available'],

  // Tobacco Products
  ['duhanske proizvode', 'tobacco products available'],
  ['tobacco products', 'tobacco products available'],
  ['duhanske', 'tobacco products available'],
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

  const variations = createEnhancedSearchVariations(term);
  const likeConditions = variations.flatMap((v) => [
    { name: { [Op.iLike]: `%${v}%` } },
    { description: { [Op.iLike]: `%${v}%` } },
  ]);

  console.log('[Enhanced Global Menu Search] Searching with variations:', {
    term,
    variations: variations.slice(0, 8), // Show more variations
  });

  // Find item translations first (both menu and drink) for partner restaurants only
  const [menuTranslations, drinkTranslations] = await Promise.all([
    MenuItemTranslation.findAll({
      where: {
        [Op.or]: likeConditions,
        ...(process.env.POSTGRES_SIMILARITY_ENABLED === 'true'
          ? {
              [Op.or]: [
                ...likeConditions,
                Sequelize.where(
                  Sequelize.fn('similarity', Sequelize.col('name'), term),
                  { [Op.gt]: 0.3 },
                ),
              ],
            }
          : {}),
      },
      include: [
        {
          model: MenuItem,
          as: 'menuItem',
          attributes: ['id', 'restaurantId', 'price', 'imageUrl'],
          where: { isActive: true },
          required: true,
        },
      ],
      order:
        process.env.POSTGRES_SIMILARITY_ENABLED === 'true'
          ? [[Sequelize.fn('similarity', Sequelize.col('name'), term), 'DESC']]
          : undefined,
      limit: 100,
    }),
    DrinkItemTranslation.findAll({
      where: {
        [Op.or]: likeConditions,
        ...(process.env.POSTGRES_SIMILARITY_ENABLED === 'true'
          ? {
              [Op.or]: [
                ...likeConditions,
                Sequelize.where(
                  Sequelize.fn('similarity', Sequelize.col('name'), term),
                  { [Op.gt]: 0.3 },
                ),
              ],
            }
          : {}),
      },
      include: [
        {
          model: DrinkItem,
          as: 'drinkItem',
          attributes: ['id', 'restaurantId', 'price', 'imageUrl'],
          where: { isActive: true },
          required: true,
        },
      ],
      order:
        process.env.POSTGRES_SIMILARITY_ENABLED === 'true'
          ? [[Sequelize.fn('similarity', Sequelize.col('name'), term), 'DESC']]
          : undefined,
      limit: 100,
    }),
  ]);

  const restaurantIds = new Set();
  const menuIds = new Set();
  const drinkIds = new Set();
  menuTranslations.forEach((t) => {
    if (t.menuItem) {
      restaurantIds.add(t.menuItem.restaurantId);
      menuIds.add(t.menuItem.id);
    }
  });
  drinkTranslations.forEach((t) => {
    if (t.drinkItem) {
      restaurantIds.add(t.drinkItem.restaurantId);
      drinkIds.add(t.drinkItem.id);
    }
  });

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
      'thumbnailUrl',
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
  const restaurantById = new Map(
    restaurants.map((r) => [r.id, r.get ? r.get() : r]),
  );

  // Fetch item details with translations and images
  const [menuItems, drinkItems] = await Promise.all([
    menuIds.size
      ? MenuItem.findAll({
          where: { id: { [Op.in]: Array.from(menuIds) } },
          attributes: ['id', 'restaurantId', 'price', 'imageUrl'],
          include: [
            {
              model: MenuItemTranslation,
              as: 'translations',
              attributes: ['language', 'name'],
            },
          ],
        })
      : Promise.resolve([]),
    drinkIds.size
      ? DrinkItem.findAll({
          where: { id: { [Op.in]: Array.from(drinkIds) } },
          attributes: ['id', 'restaurantId', 'price', 'imageUrl'],
          include: [
            {
              model: DrinkItemTranslation,
              as: 'translations',
              attributes: ['language', 'name'],
            },
          ],
        })
      : Promise.resolve([]),
  ]);

  const menuById = new Map(menuItems.map((m) => [m.id, m.get ? m.get() : m]));
  const drinkById = new Map(drinkItems.map((d) => [d.id, d.get ? d.get() : d]));

  function toTranslationsMap(translations = []) {
    const t = { hr: { name: '' }, en: { name: '' } };
    for (const tr of translations) {
      if (tr.language === 'hr') t.hr.name = tr.name || '';
      if (tr.language === 'en') t.en.name = tr.name || '';
    }
    return t;
  }

  const results = [];
  const pushUnique = (arr, rec, keyFn) => {
    const key = keyFn(rec);
    if (!arr.some((x) => keyFn(x) === key)) arr.push(rec);
  };

  menuTranslations.forEach((t) => {
    const rest = t.menuItem
      ? restaurantById.get(t.menuItem.restaurantId)
      : null;
    const item = t.menuItem ? menuById.get(t.menuItem.id) : null;
    if (rest && item)
      pushUnique(
        results,
        {
          type: 'food',
          restaurant: rest,
          item: {
            id: item.id,
            restaurantId: item.restaurantId,
            price: item.price != null ? Number(item.price) : null,
            thumbnailUrl: item.imageUrl
              ? getMediaUrl(item.imageUrl, 'image')
              : null,
            translations: toTranslationsMap(item.translations || []),
          },
        },
        (x) => `food:${x.item.id}:${x.restaurant.id}`,
      );
  });
  drinkTranslations.forEach((t) => {
    const rest = t.drinkItem
      ? restaurantById.get(t.drinkItem.restaurantId)
      : null;
    const item = t.drinkItem ? drinkById.get(t.drinkItem.id) : null;
    if (rest && item)
      pushUnique(
        results,
        {
          type: 'drink',
          restaurant: rest,
          item: {
            id: item.id,
            restaurantId: item.restaurantId,
            price: item.price != null ? Number(item.price) : null,
            thumbnailUrl: item.imageUrl
              ? getMediaUrl(item.imageUrl, 'image')
              : null,
            translations: toTranslationsMap(item.translations || []),
          },
        },
        (x) => `drink:${x.item.id}:${x.restaurant.id}`,
      );
  });

  return results;
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
  const variations = createSearchVariations(term);
  return variations.map((v) => `%${v}%`);
}

async function searchMenuForRestaurant(restaurantId, term, preferLang = 'hr') {
  if (!restaurantId || !term) return [];

  const variations = createSearchVariations(term);
  const likes = variations.map((v) => `%${v}%`);

  // Generiraj LIKE uvjete za sve varijacije
  const likeConditions = variations.flatMap((v) => [
    { name: { [Op.iLike]: `%${v}%` } },
    { description: { [Op.iLike]: `%${v}%` } },
  ]);

  console.log('[Menu Search] Searching with variations:', {
    term,
    variations: variations.slice(0, 5), // Log samo prve 5 varijacija
    restaurantId,
  });

  const [menuTranslations, drinkTranslations] = await Promise.all([
    MenuItemTranslation.findAll({
      where: {
        [Op.or]: likeConditions,
        // Također dodaj Sequelize.where za similarity search ako je dostupan
        ...(process.env.POSTGRES_SIMILARITY_ENABLED === 'true'
          ? {
              [Op.or]: [
                ...likeConditions,
                Sequelize.where(
                  Sequelize.fn('similarity', Sequelize.col('name'), term),
                  { [Op.gt]: 0.3 },
                ),
              ],
            }
          : {}),
      },
      include: [
        {
          model: MenuItem,
          as: 'menuItem',
          attributes: ['id', 'restaurantId', 'price', 'imageUrl'],
          where: { restaurantId, isActive: true },
          required: true,
          include: [
            {
              model: MenuItemTranslation,
              as: 'translations',
              attributes: ['language', 'name', 'description'],
            },
          ],
        },
      ],
      attributes: ['language'],
      order:
        process.env.POSTGRES_SIMILARITY_ENABLED === 'true'
          ? [[Sequelize.fn('similarity', Sequelize.col('name'), term), 'DESC']]
          : undefined,
      limit: 50,
    }),
    DrinkItemTranslation.findAll({
      where: {
        [Op.or]: likeConditions,
        ...(process.env.POSTGRES_SIMILARITY_ENABLED === 'true'
          ? {
              [Op.or]: [
                ...likeConditions,
                Sequelize.where(
                  Sequelize.fn('similarity', Sequelize.col('name'), term),
                  { [Op.gt]: 0.3 },
                ),
              ],
            }
          : {}),
      },
      include: [
        {
          model: DrinkItem,
          as: 'drinkItem',
          attributes: ['id', 'restaurantId', 'price', 'imageUrl'],
          where: { restaurantId, isActive: true },
          required: true,
          include: [
            {
              model: DrinkItemTranslation,
              as: 'translations',
              attributes: ['language', 'name', 'description'],
            },
          ],
        },
      ],
      attributes: ['language'],
      order:
        process.env.POSTGRES_SIMILARITY_ENABLED === 'true'
          ? [[Sequelize.fn('similarity', Sequelize.col('name'), term), 'DESC']]
          : undefined,
      limit: 50,
    }),
  ]);

  const menuIds = Array.from(
    new Set(
      menuTranslations.map((t) => t.menuItem && t.menuItem.id).filter(Boolean),
    ),
  );
  const drinkIds = Array.from(
    new Set(
      drinkTranslations
        .map((t) => t.drinkItem && t.drinkItem.id)
        .filter(Boolean),
    ),
  );

  const [menuItems, drinkItems] = await Promise.all([
    menuIds.length
      ? MenuItem.findAll({
          where: { id: { [Op.in]: menuIds } },
          attributes: ['id', 'restaurantId', 'price', 'imageUrl'],
          include: [
            {
              model: MenuItemTranslation,
              as: 'translations',
              attributes: ['language', 'name'],
            },
          ],
        })
      : Promise.resolve([]),
    drinkIds.length
      ? DrinkItem.findAll({
          where: { id: { [Op.in]: drinkIds } },
          attributes: ['id', 'restaurantId', 'price', 'imageUrl'],
          include: [
            {
              model: DrinkItemTranslation,
              as: 'translations',
              attributes: ['language', 'name'],
            },
          ],
        })
      : Promise.resolve([]),
  ]);

  function toTranslationsMap(translations = []) {
    const t = { hr: { name: '' }, en: { name: '' } };
    for (const tr of translations) {
      if (tr.language === 'hr') t.hr.name = tr.name || '';
      if (tr.language === 'en') t.en.name = tr.name || '';
    }
    return t;
  }

  const out = [];
  for (const m of menuItems) {
    const obj = m.get ? m.get() : m;
    out.push({
      type: 'food',
      id: obj.id,
      restaurantId: obj.restaurantId,
      price: obj.price != null ? Number(obj.price) : null,
      thumbnailUrl: obj.imageUrl ? getMediaUrl(obj.imageUrl, 'image') : null,
      translations: toTranslationsMap(obj.translations || []),
      name: pickNameByLang(obj.translations || [], preferLang),
    });
  }
  for (const d of drinkItems) {
    const obj = d.get ? d.get() : d;
    out.push({
      type: 'drink',
      id: obj.id,
      restaurantId: obj.restaurantId,
      price: obj.price != null ? Number(obj.price) : null,
      thumbnailUrl: obj.imageUrl ? getMediaUrl(obj.imageUrl, 'image') : null,
      translations: toTranslationsMap(obj.translations || []),
      name: pickNameByLang(obj.translations || [], preferLang),
    });
  }
  return out;
}

// Returns up to maxItems of all menu items (food + drinks) for a restaurant,
// selecting best translation per item for preferLang
async function fetchAllMenuItemsForRestaurant(
  restaurantId,
  preferLang = 'hr',
  maxItems = 60,
) {
  if (!restaurantId) return [];
  const [foods, drinks] = await Promise.all([
    MenuItem.findAll({
      where: { restaurantId },
      attributes: ['id', 'price', 'imageUrl', 'restaurantId'],
      include: [
        {
          model: MenuItemTranslation,
          as: 'translations',
          attributes: ['language', 'name'],
        },
      ],
      limit: maxItems,
    }),
    DrinkItem.findAll({
      where: { restaurantId },
      attributes: ['id', 'price', 'imageUrl', 'restaurantId'],
      include: [
        {
          model: DrinkItemTranslation,
          as: 'translations',
          attributes: ['language', 'name'],
        },
      ],
      limit: maxItems,
    }),
  ]);

  function toTranslationsMap(translations = []) {
    const t = { hr: { name: '' }, en: { name: '' } };
    for (const tr of translations) {
      if (tr.language === 'hr') t.hr.name = tr.name || '';
      if (tr.language === 'en') t.en.name = tr.name || '';
    }
    return t;
  }

  const items = [];
  for (const m of foods) {
    const obj = m.get ? m.get() : m;
    items.push({
      type: 'food',
      id: obj.id,
      restaurantId: obj.restaurantId,
      price: obj.price != null ? Number(obj.price) : null,
      thumbnailUrl: obj.imageUrl ? getMediaUrl(obj.imageUrl, 'image') : null,
      translations: toTranslationsMap(obj.translations || []),
      name: pickNameByLang(obj.translations || [], preferLang),
    });
  }
  for (const d of drinks) {
    const obj = d.get ? d.get() : d;
    items.push({
      type: 'drink',
      id: obj.id,
      restaurantId: obj.restaurantId,
      price: obj.price != null ? Number(obj.price) : null,
      thumbnailUrl: obj.imageUrl ? getMediaUrl(obj.imageUrl, 'image') : null,
      translations: toTranslationsMap(obj.translations || []),
      name: pickNameByLang(obj.translations || [], preferLang),
    });
  }

  // Deduplicate by name+price in case of overlaps
  const seen = new Set();
  const unique = [];
  for (const it of items) {
    const namePref = pickNameByLang(
      [
        { language: 'hr', name: it.translations?.hr?.name || '' },
        { language: 'en', name: it.translations?.en?.name || '' },
      ],
      preferLang,
    );
    const key = `${namePref}|${it.price ?? ''}`;
    if (!seen.has(key) && namePref) {
      seen.add(key);
      unique.push(it);
    }
  }

  return unique.slice(0, maxItems);
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

async function findCheapestItemsForRestaurant(restaurantId, preferLang = 'hr') {
  const [foods, drinks] = await Promise.all([
    MenuItem.findAll({
      where: { restaurantId, price: { [Op.ne]: null } },
      attributes: ['id', 'price'],
      order: [['price', 'ASC']],
      limit: 10,
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
      order: [['price', 'ASC']],
      limit: 10,
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
  if (items.length === 0) return { minPrice: null, items: [] };
  const minPrice = Math.min(...items.map((i) => i.price || 0));
  return { minPrice, items: items.filter((i) => i.price === minPrice) };
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

// New function: Get comprehensive restaurant offerings
async function getRestaurantOfferings(restaurantId, lang = 'hr') {
  if (!restaurantId) return null;
  
  try {
    const [restaurant, menuItems, drinkItems, types] = await Promise.all([
      fetchRestaurantDetails(restaurantId),
      fetchAllMenuItemsForRestaurant(restaurantId),
      DrinkItemTranslation.findAll({
        include: [
          {
            model: DrinkItem,
            as: 'drinkItem',
            where: { restaurantId },
            attributes: ['id', 'price'],
            required: true,
          },
        ],
        where: { language: lang },
        limit: 10,
      }),
      fetchTypesForRestaurant(restaurantId),
    ]);

    const offerings = {
      restaurantId,
      restaurantName: restaurant?.name,
      foodTypes: types?.foodTypes || [],
      establishmentTypes: types?.establishmentTypes || [],
      establishmentPerks: types?.establishmentPerks || [],
      mealTypes: types?.mealTypes || [],
      dietaryTypes: types?.dietaryTypes || [],
      priceCategory: restaurant?.priceCategory,
      menuItems: menuItems?.slice(0, 8) || [], // Limit to 8 items
      drinkItems: drinkItems?.map(dt => ({
        id: dt.drinkItem.id,
        name: dt.name,
        description: dt.description,
        price: dt.drinkItem.price,
      })).slice(0, 5) || [], // Limit to 5 drinks
      reservationEnabled: restaurant?.reservationEnabled,
      openingHours: restaurant?.openingHours,
      description: restaurant?.description,
    };

    return offerings;
  } catch (error) {
    console.error('Error fetching restaurant offerings:', error);
    return null;
  }
}

module.exports = {
  fetchPartnersBasic,
  fetchRestaurantDetails,
  searchMenuAcrossRestaurants,
  searchMenuForRestaurant,
  fetchAllMenuItemsForRestaurant,
  findMostExpensiveItemsForRestaurant,
  findCheapestItemsForRestaurant,
  findNearbyPartners,
  fetchTypesForRestaurant,
  fetchReviewsSummary,
  getAllPerksCached,
  resolvePerkIdByName,
  getRestaurantOfferings,
};
