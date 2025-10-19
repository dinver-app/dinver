'use strict';

const ResponseGenerator = require('./llm/responseGenerator');

let responseGenerator = null;
function getResponseGenerator() {
  if (!responseGenerator) {
    responseGenerator = new ResponseGenerator();
  }
  return responseGenerator;
}

function mapRestaurantsForReply(restaurants) {
  if (!Array.isArray(restaurants)) return [];

  return restaurants.map((r) => ({
    id: r.id,
    name: r.name,
    address: r.address ?? null,
    place: r.place ?? null,
    thumbnailUrl: r.thumbnailUrl ?? null,
    distance: Number.isFinite(r.distance) ? r.distance : null,
  }));
}

function mapMenuItemsForReply(items, lang = 'hr') {
  if (!Array.isArray(items)) return [];

  return items.map((it) => {
    const tr = it.translations || {};
    const langs = [lang, lang === 'hr' ? 'en' : 'hr'];
    let name = null;

    for (const L of langs) {
      if (tr[L]?.name) {
        name = tr[L].name;
        break;
      }
    }

    if (!name) {
      const any = Object.values(tr)[0];
      name = any?.name || '—';
    }

    return {
      type: it.type === 'drink' ? 'drink' : 'food',
      id: it.id,
      restaurantId: it.restaurantId,
      name,
      translations: tr
        ? {
            hr: tr.hr?.name ? { name: tr.hr.name } : undefined,
            en: tr.en?.name ? { name: tr.en.name } : undefined,
          }
        : null,
      thumbnailUrl: it.imageUrl || it.thumbnailUrl || null,
      price: Number.isFinite(it.price) ? Number(it.price) : (it.price ?? null),
    };
  });
}

async function buildGlobalSearchReply(
  searchResult,
  language = 'hr',
  searchContext = {},
  taxonomyHelper = null,
) {
  const restaurants = mapRestaurantsForReply(searchResult.restaurants || []);
  const count = restaurants.length;

  const generator = getResponseGenerator();
  const text = await generator.generateGlobalSearchResponse(
    count,
    language,
    searchContext,
    taxonomyHelper,
  );

  return {
    text,
    restaurants,
  };
}

async function buildRestaurantDetailsReply(
  details,
  language = 'hr',
  menuTerms = [],
) {
  const dietaryKeywordMap = {
    vegetarian: [
      'vegetarian',
      'vegetarijansku',
      'vegetarijanska',
      'vegetarijanski',
      'veggie',
    ],
    vegan: ['vegan', 'veganska', 'veganski', 'vegansku'],
    'gluten-free': [
      'gluten-free',
      'gluten free',
      'bez glutena',
      'bezglutensko',
      'bezglutenska',
    ],
    'lactose-free': [
      'lactose-free',
      'lactose free',
      'bez laktoze',
      'bezlaktozno',
    ],
    halal: ['halal'],
    kosher: ['kosher'],
  };

  const normalizedTerms = menuTerms.map((t) => t.toLowerCase());

  let matchedDietaryType = null;
  for (const [canonical, variations] of Object.entries(dietaryKeywordMap)) {
    if (
      variations.some((v) => normalizedTerms.some((term) => term.includes(v)))
    ) {
      matchedDietaryType = canonical;
      break;
    }
  }

  if (matchedDietaryType) {
    const dietaryTypes = details.dietaryTypes || [];

    const supportedType = dietaryTypes.find((dt) => {
      const dtName = (dt.nameEn || dt.name || '').toLowerCase();
      return (
        dtName.includes(matchedDietaryType.toLowerCase()) ||
        matchedDietaryType.toLowerCase().includes(dtName)
      );
    });

    const displayName = supportedType
      ? language === 'hr'
        ? supportedType.nameHr || supportedType.name
        : supportedType.nameEn || supportedType.name
      : menuTerms.join(', ');

    const generator = getResponseGenerator();
    const text = await generator.generateDietaryResponse(
      details.name,
      language,
      !!supportedType,
      displayName,
    );

    return {
      text,
      restaurantId: details.id,
      restaurantName: details.name,
    };
  }

  const followUp =
    language === 'hr'
      ? 'Želiš li vidjeti radno vrijeme, jelovnik ili provjeru dostupnosti?'
      : 'Want to see working hours, menu, or check availability?';

  const text =
    language === 'hr'
      ? `📍 **${details.name}**${details.address ? ` • ${details.address}` : ''}${
          details.place ? ` • ${details.place}` : ''
        }. ${followUp}`
      : `📍 **${details.name}**${details.address ? ` • ${details.address}` : ''}${
          details.place ? ` • ${details.place}` : ''
        }. ${followUp}`;

  return {
    text,
    restaurantId: details.id,
    restaurantName: details.name,
    restaurants: [
      {
        id: details.id,
        name: details.name,
        address: details.address || null,
        place: details.place || null,
        thumbnailUrl: details.thumbnailUrl || null,
        distance: null,
      },
    ],
  };
}

async function buildMenuSearchReply(
  menuData,
  restaurantId,
  restaurantName,
  language = 'hr',
  isRecommendation = false,
  searchQuery = [],
) {
  const items = mapMenuItemsForReply(menuData.items || [], language);
  const generator = getResponseGenerator();
  const text = await generator.generateMenuSearchResponse(
    items.length,
    restaurantName,
    language,
    isRecommendation,
    searchQuery,
  );

  return {
    text,
    restaurantId,
    restaurantName: restaurantName || null,
    items,
  };
}

async function buildOpenNowReply(
  details,
  language = 'hr',
  openStatus = null,
  checkTime = null,
) {
  const generator = getResponseGenerator();
  const text = await generator.generateOpenNowResponse(
    details.name,
    language,
    openStatus,
    checkTime,
  );

  return {
    text,
    restaurantId: details.id,
    restaurantName: details.name,
  };
}

function buildClarifyReply(question) {
  return {
    text: question,
    restaurantId: null,
    restaurantName: null,
  };
}

module.exports = {
  mapRestaurantsForReply,
  mapMenuItemsForReply,
  buildGlobalSearchReply,
  buildRestaurantDetailsReply,
  buildMenuSearchReply,
  buildOpenNowReply,
  buildClarifyReply,
};
