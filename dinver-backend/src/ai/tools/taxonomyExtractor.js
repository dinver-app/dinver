'use strict';

const axios = require('axios');
const { normalize, splitCommaTerms } = require('./searchTextHelper');

const TAXONOMY_URL =
  process.env.TAXONOMY_URL || 'http://localhost:3000/api/app/ai/taxonomy';
const TAXONOMY_CACHE_MS = 10 * 60 * 1000;
let _taxCache = { ts: 0, data: null };

async function getTaxonomies() {
  const fresh = _taxCache.data && Date.now() - _taxCache.ts < TAXONOMY_CACHE_MS;
  if (fresh) return _taxCache.data;
  const r = await axios.get(TAXONOMY_URL, { timeout: 8000 });
  if (r.status !== 200) throw new Error(`Taxonomy fetch failed: ${r.status}`);
  const json = r.data;
  if (!json?.ok || !json?.result) throw new Error('Bad taxonomy payload');
  _taxCache = { ts: Date.now(), data: json.result };
  return _taxCache.data;
}

const SYNONYMS = {
  dietaryTypes: {
    vegetarian: [
      'vege',
      'vegetarijansko',
      'vegetarijanski',
      'vegetarian',
      'veg',
    ],
    vegan: ['veganski', 'vegan', 'plant based', 'biljno', 'plant-based'],
    'gluten-free': ['bez glutena', 'gluten free', 'gf', 'glutenfree'],
    halal: ['halal', 'halal options', 'halal opcije'],
  },
  mealTypes: {
    breakfast: ['dorucak', 'doručak', 'breakfast'],
    brunch: ['brunch'],
    lunch: ['rucak', 'ručak', 'lunch'],
    dinner: ['vecera', 'večera', 'dinner'],
    'late night': ['kasna vecera', 'kasna večera', 'late night'],
    drinks: ['pice', 'piće', 'drinks', 'bar snacks'],
  },
  establishmentPerks: {
    'outdoor seating': ['terasa', 'vanjska terasa', 'outdoor', 'garden'],
    'free wi-fi': ['wifi', 'wi fi', 'besplatan wifi', 'free wi-fi'],
    'rooftop view': ['krovna terasa', 'rooftop'],
    'sports bar': ['sportski bar', 'utakmice', 'prijenos utakmica'],
    'live music': ['glazba uzivo', 'glazba uživo', 'live music'],
    'pet-friendly': ['pet friendly', 'psi dozvoljeni', 'kućni ljubimci'],
    'paid parking': ['placeni parking', 'plaćeni parking'],
    'free parking': ['besplatni parking', 'free parking'],
    'coffee to go available': ['kava za van', 'coffee to go'],
    'quick bites': ['brzi zalogaji', 'fast casual'],
    'all-you-can-eat buffet': ['all you can eat', 'ayce', 'buffet'],
    'air-conditioned space': ['klima', 'klimatizirano'],
  },
  establishmentTypes: {
    restaurant: ['restoran', 'restaurant'],
    cafe: ['kafic', 'kafić', 'cafe', 'coffee shop'],
    bar: ['bar', 'cocktail bar', 'koktel bar'],
    pub: ['pub'],
    bistro: ['bistro'],
    buffet: ['bife', 'buffet'],
    'food truck': ['food truck', 'truck'],
    'hotel restaurant': ['hotel restoran', 'restoran u hotelu'],
    'cake shop': ['slasticarnica', 'slastičarnica', 'cake shop', 'patisserie'],
    'brunch place': ['brunch place', 'brunch'],
    'juice & smoothie bar': [
      'juice bar',
      'smoothie bar',
      'juice & smoothie bar',
    ],
  },
  foodTypes: {
    pizza: ['pizza', 'pizze', 'pice', 'pica'],
    burgers: ['burger', 'burgeri', 'burgers', 'hamburger', 'chickenburger'],
    'bbq & grill': ['rostilj', 'roštilj', 'grill', 'bbq'],
    sushi: ['susi', 'sushi'],
    pasta: ['tjestenina', 'pasta'],
    'noodles / ramen': ['ramen', 'rezanci', 'noodles'],
    kebab: ['kebab', 'doner'],
    pancakes: ['palacinke', 'palačinke', 'crepes', 'crepe', 'pancakes'],
    'rice dishes': [
      'rizoto',
      'rižoto',
      'jela od rize',
      'jela od riže',
      'rice',
      'riža',
    ],
    soups: ['juha', 'juhe', 'soup', 'soups'],
    'ice cream': ['sladoled', 'gelato', 'ice cream'],
    'bakery products & pastries': [
      'pekara',
      'pekarski',
      'peciva',
      'pastries',
      'bakery',
    ],
    'desserts & sweets': [
      'desert',
      'slastice',
      'kolaci',
      'kolači',
      'desserts',
      'sweets',
    ],
    'home-style cuisine': [
      'domaca',
      'domaća',
      'kod kuce',
      'kao kod kuće',
      'home-style',
      'homemade',
    ],
    wok: ['wok'],
    burek: ['burek'],
    ćevapi: ['cevapi', 'ćevapi', 'cevap', 'ćevap'],
    chicken: ['piletina', 'chicken'],
    healthy: ['zdravo', 'healthy', 'fit'],
    'croatian cuisine': ['hrvatska kuhinja', 'domaca kuhinja', 'croatian'],
    'italian cuisine': ['talijanska kuhinja', 'italijanska', 'italian'],
    'mexican cuisine': ['meksička kuhinja', 'mexican', 'tacos'],
    'indian food': ['indijska kuhinja', 'indian', 'curry'],
    'japanese cuisine': ['japanska kuhinja', 'japanese'],
    'chinese cuisine': ['kineska kuhinja', 'chinese'],
    'thai cuisine': ['tajlandska kuhinja', 'thai'],
    'mediterranean cuisine': ['mediteranska kuhinja', 'mediterranean'],
    'french cuisine': ['francuska kuhinja', 'french'],
    'turkish cuisine': ['turska kuhinja', 'turkish'],
    'greek cuisine': ['grcka kuhinja', 'grčka kuhinja', 'greek'],
    'lebanese cuisine': ['libanonska kuhinja', 'lebanese'],
    'korean cuisine': ['korejska kuhinja', 'korean'],
    'street food': ['street food', 'ulicna hrana', 'ulična hrana'],
    'bosnian cuisine': ['bosanska kuhinja', 'bosnian'],
  },
  allergens: {
    gluten: ['gluten', 'bez glutena?'],
    fish: ['riba', 'fish'],
    shellfish: ['skoljke', 'školjke', 'shellfish'],
    eggs: ['jaja', 'eggs'],
    'dairy products (lactose)': [
      'mlijecno',
      'mliječni proizvodi',
      'laktoza',
      'lactose',
      'dairy',
    ],
    nuts: ['orasasti', 'orašasti', 'nuts'],
    peanuts: ['kikiriki', 'peanuts'],
    soy: ['soja', 'soy', 'soya'],
    sesame: ['sezam', 'sesame'],
    celery: ['celer', 'celery'],
    mustard: ['gorusica', 'gorušica', 'mustard'],
    lupin: ['lupina', 'lupin'],
    sulfites: ['sulfiti', 'sulfites', 'sulphites'],
  },
  priceCategories: {
    'budget friendly': [
      'pristupacno',
      'pristupačno',
      'budget',
      'cheap',
      'jeftino',
    ],
    'mid-range': ['srednja cijena', 'mid range', 'mid-range', 'osrednje'],
    'fine dining': [
      'fine dining',
      'skupo',
      'premium',
      'luksuzno',
      'high class',
    ],
  },
};

function buildIndex(list, key) {
  const idx = new Map();
  for (const t of list || []) {
    idx.set(normalize(t.nameHr), t.id);
    idx.set(normalize(t.nameEn), t.id);
  }
  const syn = SYNONYMS[key] || {};
  for (const canonical in syn) {
    const id = (list || []).find(
      (t) =>
        normalize(t.nameEn) === normalize(canonical) ||
        normalize(t.nameHr) === normalize(canonical),
    )?.id;
    if (!id) continue;
    for (const variant of syn[canonical]) {
      idx.set(normalize(variant), id);
    }
  }
  return idx;
}

async function extractTaxonomiesFromPrompt(prompt) {
  const tax = await getTaxonomies();
  const indices = {
    foodTypes: buildIndex(tax.foodTypes, 'foodTypes'),
    establishmentTypes: buildIndex(
      tax.establishmentTypes,
      'establishmentTypes',
    ),
    establishmentPerks: buildIndex(
      tax.establishmentPerks,
      'establishmentPerks',
    ),
    mealTypes: buildIndex(tax.mealTypes, 'mealTypes'),
    dietaryTypes: buildIndex(tax.dietaryTypes, 'dietaryTypes'),
    allergens: buildIndex(tax.allergens, 'allergens'),
    priceCategories: buildIndex(tax.priceCategories, 'priceCategories'),
  };

  const parts = splitCommaTerms(prompt);
  const matched = {
    foodTypeIds: new Set(),
    establishmentTypeIds: new Set(),
    establishmentPerkIds: new Set(),
    mealTypeIds: new Set(),
    dietaryTypeIds: new Set(),
    allergenIds: new Set(),
    priceCategoryIds: new Set(),
  };

  const matchedTerms = {};
  const leftoverTerms = [];
  const tryMatch = (n, idx, bucket) => {
    const id = idx.get(n);
    if (id) {
      matched[bucket].add(id);
      return id;
    }
    const tokens = n.split(' ').filter(Boolean);
    for (let len = tokens.length; len >= 1; len--) {
      const cand = tokens.slice(0, len).join(' ');
      const id2 = idx.get(cand);
      if (id2) {
        matched[bucket].add(id2);
        return id2;
      }
    }
    return null;
  };

  for (const raw of parts) {
    const n = normalize(raw);
    let id =
      tryMatch(n, indices.foodTypes, 'foodTypeIds') ||
      tryMatch(n, indices.establishmentPerks, 'establishmentPerkIds') ||
      tryMatch(n, indices.establishmentTypes, 'establishmentTypeIds') ||
      tryMatch(n, indices.mealTypes, 'mealTypeIds') ||
      tryMatch(n, indices.dietaryTypes, 'dietaryTypeIds') ||
      tryMatch(n, indices.allergens, 'allergenIds') ||
      tryMatch(n, indices.priceCategories, 'priceCategoryIds');

    if (id) matchedTerms[raw] = id;
    else leftoverTerms.push(raw);
  }

  const ids = Object.fromEntries(
    Object.entries(matched).map(([k, v]) => [k, Array.from(v)]),
  );

  return { ids, leftoverTerms, matchedTerms, taxonomies: tax };
}

module.exports = {
  extractTaxonomiesFromPrompt,
  getTaxonomies,
  normalize,
};
