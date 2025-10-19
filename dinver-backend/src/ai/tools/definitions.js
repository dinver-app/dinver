const AVAILABLE_TOOLS = {
  taxonomy: {
    name: 'taxonomy',
    description:
      'Return all taxonomies: allergens, meal types, dietary types, establishment perks & types, food types, and price categories.',
    endpoint: '/app/ai/taxonomy',
    method: 'GET',
    parameters: [],
    returns:
      'JSON: { ok: boolean, result: { allergens[], mealTypes[], dietaryTypes[], establishmentPerks[], establishmentTypes[], foodTypes[], priceCategories[] } }',
    notes: [
      'Response is cached ~30 minutes.',
      'Use to normalize user free-text into canonical filter IDs (e.g., “vegan”, “terrace”, “pizza”).',
    ],
    use_cases: [
      'List categories for UI filters and chips.',
      'Map user free text to IDs before calling search.',
      'Support bilingual synonyms (EN/HR) consistently.',
      'Validate client-provided filter IDs against canonical sets.',
      'Localize category labels (HR/EN) in the UI.',
      'Slot extraction bootstrap for cuisine/dietary/perks.',
      'Backfill missing filters inferred from the user utterance.',
      'Warm client-side caches to avoid extra roundtrips.',
      'Generate analytics on which filters are popular.',
    ],
    example_queries: [
      'What filters and categories are available?',
      'Show all dietary types and allergens.',
      'Which establishment perks do you support?',
      'List all food types and price categories.',
      'Koje filtere i kategorije imate?',
      'Prikaži sve prehrambene opcije i alergene.',
      'Koje perkove podržavate?',
      'Prikaži sve vrste hrane i cjenovne kategorije.',
    ],
  },

  search_global: {
    name: 'search_global',
    description:
      'Search claimed partner restaurants with location and rich filters. Returns a ranked list with pagination.',
    endpoint: '/app/ai/search/global',
    method: 'GET',
    parameters: [
      {
        name: 'query',
        type: 'string',
        required: false,
        description:
          'Search by restaurant name or comma-separated menu item terms, e.g. "sushi, terrace". Taxonomy middleware expands/normalizes.',
      },
      {
        name: 'latitude',
        type: 'number',
        required: false,
        description: 'User latitude for distance and radius filters.',
      },
      {
        name: 'longitude',
        type: 'number',
        required: false,
        description: 'User longitude.',
      },
      {
        name: 'radiusKm',
        type: 'number',
        required: false,
        default: 60,
        description:
          'Search radius in kilometers (applies when coordinates are provided).',
      },

      {
        name: 'establishmentTypeIds',
        type: 'string',
        required: false,
        description: 'CSV of establishment type IDs.',
      },
      {
        name: 'mealTypeIds',
        type: 'string',
        required: false,
        description: 'CSV of meal type IDs.',
      },
      {
        name: 'foodTypeIds',
        type: 'string',
        required: false,
        description: 'CSV of food type IDs.',
      },
      {
        name: 'dietaryTypeIds',
        type: 'string',
        required: false,
        description: 'CSV of dietary type IDs.',
      },
      {
        name: 'establishmentPerkIds',
        type: 'string',
        required: false,
        description: 'CSV of perk IDs.',
      },
      {
        name: 'priceCategoryIds',
        type: 'string',
        required: false,
        description: 'CSV of price category IDs.',
      },

      {
        name: 'minRating',
        type: 'string',
        required: false,
        enum: ['3', '4', '4.5', '4.8'],
        description: 'Rating threshold (3→3.0, 4/4.5→4.5, 4.8→4.8).',
      },
      {
        name: 'sortBy',
        type: 'string',
        required: false,
        enum: ['distance', 'rating', 'distance_rating', 'match_score', 'core'],
        description:
          'Sorting strategy; with search terms defaults to match_score.',
      },
      {
        name: 'page',
        type: 'number',
        required: false,
        description: 'Pagination (page size ≈ 20).',
      },
    ],
    returns:
      '{ restaurants: RestaurantLite[], pagination: { currentPage, totalPages, totalRestaurants } }',
    notes: [
      'Returns only claimed (partner) restaurants.',
      'Smart ranking blends name/menu match, distance, popularity, rating, and favorites.',
      'Taxonomy middleware auto-infers filters from query terms.',
      'Default radius filter (~60 km) applied when coordinates are present.',
    ],
    use_cases: [
      'Find restaurants near a user location within a given radius.',
      'Search by multi-term intent (e.g., "ramen, spicy, vegan").',
      'Budget/cost discovery via price categories + minRating.',
      'Cuisine, meal time, dietary needs, perks, and price bracket filtering.',
      'Combine rating with distance (e.g., closest highly rated).',
      'Produce top 5 cards for a homepage or “nearby now” section.',
      'Drive “similar to X” by reusing filters/cuisine from X.',
      'First step to shortlist candidates before fetching details/menus.',
      'Rerun with refined filters after a clarification question.',
      'Measure filter adoption and conversion across intents.',
      'Run experiments on sorting strategies (match_score vs distance_rating).',
    ],
    example_queries: [
      'Find Italian restaurants near me within 5 km.',
      'Show vegan-friendly brunch places with a terrace.',
      'Best sushi in Zagreb under €25 per person.',
      'Popular burger spots around my location.',
      'Recommend me a pizza restaurant',
      'I want to find a good burger place',
      'Nađi talijanske restorane blizu mene u krugu 5 km.',
      'Prikaži veganske brunch lokacije s terasom.',
      'Najbolji sushi u Zagrebu do 25 € po osobi.',
      'Popularni burger lokali oko moje lokacije.',
      'Preporuči mi restoran s pizzom',
      'Želim pronaći dobru pizzeriju',
      'Potraži mi burgere u blizini',
    ],
  },

  search_menu: {
    name: 'search_menu',
    description:
      'Search active menu items (food and drinks) within a specific restaurant; supports text relevance and price sorting.',
    endpoint: '/app/ai/search/menu',
    method: 'POST',
    parameters: [
      {
        name: 'restaurantId',
        type: 'string',
        required: true,
        description: 'Restaurant UUID.',
      },
      {
        name: 'query',
        type: 'string',
        required: false,
        description: 'Free text; diacritics and variants normalized.',
      },
      {
        name: 'includeFood',
        type: 'boolean',
        required: false,
        default: true,
        description: 'Include food items.',
      },
      {
        name: 'includeDrinks',
        type: 'boolean',
        required: false,
        default: true,
        description: 'Include drink items.',
      },
      {
        name: 'sort',
        type: 'string',
        required: false,
        options: ['relevance', 'price_asc', 'price_desc'],
        description:
          'Default relevance (when query present); otherwise price_asc.',
      },
      {
        name: 'limit',
        type: 'number',
        required: false,
        default: 50,
        description: 'Max 50.',
      },
      {
        name: 'offset',
        type: 'number',
        required: false,
        default: 0,
        description: 'Pagination offset.',
      },
    ],
    returns:
      '{ items: [{ type, id, restaurantId, price, imageUrl, translations{hr,en}, score }], meta: { restaurantId, query, sort, limit, offset, count, totalCount } }',
    notes: [
      'Scores HR/EN names/descriptions; exact-word matches get a small boost.',
      'Price is direct or min of sizes; images via CDN helper.',
      'Great for building “signature items” previews in cards.',
    ],
    use_cases: [
      'Answer “do they have X?” with price and quick context.',
      'List vegetarian/vegan/gluten-free items typed by user.',
      'Show cocktails, coffee, or dessert lists quickly.',
      'Power “Search within menu” box on the detail screen.',
      'Sort by price to surface budget-friendly picks.',
      'After search_global, fetch top 1–2 matching dishes per candidate.',
      'Confirm availability/pricing before stating facts to the user.',
      'Detect missing translations or prices (items with null price).',
      'Spot menu sections that need imagery (missing imageUrl).',
    ],
    example_queries: [
      'What pizzas does Restaurant X offer?',
      'Show vegetarian options at Restaurant Y.',
      'Find cocktails at Bar Z.',
      'Search for pasta dishes at this place.',
      'Koje pizze nudi restoran X?',
      'Prikaži vegetarijanske opcije u restoranu Y.',
      'Nađi koktele u baru Z.',
      'Pretraži tjesteninu u ovom lokalu.',
    ],
  },

  restaurant_details: {
    name: 'restaurant_details',
    description:
      'Return full restaurant details (profile, address, media, types/perks, rating, recent reviews, etc.).',
    endpoint: '/app/ai/restaurant/{restaurantId}',
    method: 'GET',
    parameters: [
      {
        name: 'restaurantId',
        type: 'string',
        required: true,
        description: 'Restaurant UUID.',
      },
    ],
    returns:
      'RestaurantFull JSON from getFullRestaurantDetails, including thumbnails/images via CDN, types/perks, rating, and recent reviews.',
    notes: [
      'Use after search_global to render a detailed page or to cite facts (address, contacts, perks).',
      'Pair with search_menu to show 1–2 highlighted dishes.',
    ],
    use_cases: [
      'Render the full detail view when a user taps a card.',
      'Provide address, phone/website, and photo gallery.',
      'Display perks (terrace, pet-friendly) and price category.',
      'Answer “tell me more about this place” accurately.',
      'Contextualize recommendations with images and ratings.',
      'Deep-link to “See full menu”, “Call”, “Directions”, or “Reserve” (if supported).',
    ],
    example_queries: [
      'Tell me about Restaurant X.',
      'Show full details of this restaurant.',
      'What is the rating and address of Restaurant Y?',
      'Does it have a terrace and photos?',
      'Reci mi više o restoranu X.',
      'Prikaži sve detalje ovog restorana.',
      'Koja je ocjena i adresa restorana Y?',
      'Ima li terasu i fotografije?',
    ],
  },
};

const TOOL_CATEGORIES = {
  discovery: ['taxonomy', 'search_global'],
  restaurant_info: ['restaurant_details'],
  menu_search: ['search_menu'],
};

const INTENT_TO_TOOLS = {
  find_restaurants: ['search_global', 'taxonomy'],
  restaurant_info: ['restaurant_details'],
  menu_search: ['search_menu'],
  restaurant_types: ['taxonomy'],
  location_search: ['search_global'],
  price_bracket: ['search_global'],
};

function getToolByName(toolName) {
  return AVAILABLE_TOOLS[toolName] || null;
}

function getToolsByCategory(category) {
  const toolNames = TOOL_CATEGORIES[category] || [];
  return toolNames.map((name) => AVAILABLE_TOOLS[name]).filter(Boolean);
}

function getToolsByIntent(intent) {
  const toolNames = INTENT_TO_TOOLS[intent] || [];
  return toolNames.map((name) => AVAILABLE_TOOLS[name]).filter(Boolean);
}

function getAllTools() {
  return Object.values(AVAILABLE_TOOLS);
}

function getToolsForPrompt() {
  return Object.entries(AVAILABLE_TOOLS).map(([_, tool]) => ({
    name: tool.name,
    description: tool.description,
    endpoint: tool.endpoint,
    method: tool.method,
    parameters: tool.parameters,
    use_cases: tool.use_cases,
    example_queries: tool.example_queries,
  }));
}

module.exports = {
  AVAILABLE_TOOLS,
  TOOL_CATEGORIES,
  INTENT_TO_TOOLS,
  getToolByName,
  getToolsByCategory,
  getToolsByIntent,
  getAllTools,
  getToolsForPrompt,
};
