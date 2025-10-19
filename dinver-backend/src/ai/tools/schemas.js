'use strict';

const tools = [
  {
    type: 'function',
    function: {
      name: 'resolve_taxonomies',
      description:
        'Map textual filters (dietary, allergens, priceCategory, types, perks, meal types) to DB IDs. Use this before global_search when user mentions food types, dietary needs, price levels, or establishment features in free text.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description:
              'Original user text or extracted keywords (e.g., "vegan terrace pizza")',
          },
          locale: {
            type: 'string',
            enum: ['hr', 'en'],
            default: 'hr',
            description: 'Language for taxonomy matching',
          },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'global_search',
      description:
        'Search restaurants by name/menu/types with filters and geo constraints. Returns ranked list of restaurants.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            nullable: true,
            description:
              'Comma-separated menu item terms or restaurant name (can be null if only filters/geo used)',
          },
          city: {
            type: 'string',
            nullable: true,
            description: 'City name (ignored if latitude/longitude provided)',
          },
          latitude: {
            type: 'number',
            nullable: true,
            description:
              'User latitude for distance calculation (takes priority over city)',
          },
          longitude: {
            type: 'number',
            nullable: true,
            description: 'User longitude',
          },
          radiusKm: {
            type: 'number',
            default: 60,
            description: 'Search radius in kilometers',
          },
          priceCategoryIds: {
            type: 'string',
            description:
              'CSV of price category IDs (e.g., "1,2") - get from resolve_taxonomies',
          },
          foodTypeIds: {
            type: 'string',
            description:
              'CSV of food type IDs (e.g., "5,12") - get from resolve_taxonomies',
          },
          dietaryTypeIds: {
            type: 'string',
            description:
              'CSV of dietary type IDs (e.g., "1,3") - get from resolve_taxonomies',
          },
          establishmentTypeIds: {
            type: 'string',
            description:
              'CSV of establishment type IDs - get from resolve_taxonomies',
          },
          establishmentPerkIds: {
            type: 'string',
            description:
              'CSV of perk IDs (e.g., terrace, parking) - get from resolve_taxonomies',
          },
          mealTypeIds: {
            type: 'string',
            description:
              'CSV of meal type IDs (breakfast, lunch, dinner) - get from resolve_taxonomies',
          },
          minRating: {
            type: 'string',
            nullable: true,
            enum: ['3', '4', '4.5', '4.8'],
            description: 'Minimum rating threshold',
          },
          sortBy: {
            type: 'string',
            enum: [
              'match_score',
              'distance',
              'rating',
              'distance_rating',
              'core',
            ],
            default: 'match_score',
            description:
              'Sorting strategy (use match_score when query present)',
          },
          limit: {
            type: 'number',
            default: 10,
            description: 'Max number of results',
          },
          page: {
            type: 'number',
            default: 1,
            description: 'Pagination page number',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_full_restaurant_details',
      description:
        'Get full restaurant details by name or id (includes working hours, address, phone, types, perks, dietary support). Use this for RESTAURANT_DETAILS intent.',
      parameters: {
        type: 'object',
        properties: {
          restaurantName: {
            type: 'string',
            nullable: true,
            description:
              'Restaurant name - will search and pick best match if ID not provided',
          },
          restaurantId: {
            type: 'string',
            nullable: true,
            description: 'Restaurant UUID - preferred if available',
          },
          includeWorkingHours: {
            type: 'boolean',
            default: true,
            description: 'Include working hours data',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_menu_items',
      description:
        'Get menu items (food & drinks) for a specific restaurant; can filter by search terms. NOTE: Menu items do NOT have dietary tags - only restaurants have dietaryTypes. Use this ONLY for searching by specific dish/drink names, NOT for dietary queries.',
      parameters: {
        type: 'object',
        properties: {
          restaurantName: {
            type: 'string',
            nullable: true,
            description: 'Restaurant name - will resolve to ID if not provided',
          },
          restaurantId: {
            type: 'string',
            nullable: true,
            description: 'Restaurant UUID - preferred if available',
          },
          terms: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Search terms for menu item names',
          },
          includeFood: {
            type: 'boolean',
            default: true,
            description: 'Include food items',
          },
          includeDrinks: {
            type: 'boolean',
            default: true,
            description: 'Include drink items',
          },
          limit: {
            type: 'number',
            default: 20,
            description: 'Max number of items',
          },
          offset: {
            type: 'number',
            default: 0,
            description: 'Pagination offset',
          },
        },
        required: [],
      },
    },
  },
];

module.exports = { tools };
