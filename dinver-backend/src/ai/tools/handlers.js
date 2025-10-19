'use strict';

const axios = require('axios');
const { globalSearchCache } = require('../utils/cache');

const API_BASE =
  process.env.INTERNAL_API_BASE || 'http://localhost:3000/api/app';
const APP_API_KEY = process.env.APP_API_KEY;
const TIMEOUT = 15000;

const http = axios.create({
  baseURL: API_BASE,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

http.interceptors.request.use((config) => {
  if (APP_API_KEY) config.headers['x-api-key'] = APP_API_KEY;

  console.log(
    '[HTTP] Request:',
    config.method?.toUpperCase(),
    config.baseURL + config.url,
  );
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    if (
      error.response &&
      error.response.status >= 500 &&
      error.response.status < 600 &&
      !config._retry
    ) {
      config._retry = true;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return http(config);
    }

    return Promise.reject(error);
  },
);

async function resolveTaxonomies(text, locale = 'hr') {
  try {
    const { data } = await http.get('/ai/taxonomy');

    if (!data.ok) {
      throw new Error('Taxonomy resolution failed');
    }

    return JSON.stringify(data.result);
  } catch (error) {
    console.error('resolveTaxonomies error:', error.message);
    throw new Error(`Taxonomy resolution failed: ${error.message}`);
  }
}

async function globalSearch(params) {
  try {
    const {
      query,
      city,
      latitude,
      longitude,
      radiusKm = 60,
      sortBy = 'match_score',
      minRating,
      priceCategoryIds = [],
      foodTypeIds = [],
      dietaryTypeIds = [],
      establishmentTypeIds = [],
      establishmentPerkIds = [],
      mealTypeIds = [],
      limit = 10,
      page = 1,
    } = params;

    const queryParams = {
      ...(query && { query }),
      ...(latitude && { latitude }),
      ...(longitude && { longitude }),
      ...(radiusKm && { radiusKm }),
      ...(sortBy && { sortBy }),
      ...(minRating && { minRating }),
      ...(limit && { limit }),
      ...(page && { page }),
    };

    if (Array.isArray(priceCategoryIds) && priceCategoryIds.length > 0) {
      queryParams.priceCategories = priceCategoryIds.join(',');
    }
    if (Array.isArray(foodTypeIds) && foodTypeIds.length > 0) {
      queryParams.foodTypes = foodTypeIds.join(',');
    }
    if (Array.isArray(dietaryTypeIds) && dietaryTypeIds.length > 0) {
      queryParams.dietaryTypes = dietaryTypeIds.join(',');
    }
    if (
      Array.isArray(establishmentTypeIds) &&
      establishmentTypeIds.length > 0
    ) {
      queryParams.establishmentTypes = establishmentTypeIds.join(',');
    }
    if (
      Array.isArray(establishmentPerkIds) &&
      establishmentPerkIds.length > 0
    ) {
      queryParams.establishmentsPerks = establishmentPerkIds.join(',');
    }
    if (Array.isArray(mealTypeIds) && mealTypeIds.length > 0) {
      queryParams.mealTypes = mealTypeIds.join(',');
    }

    const cached = globalSearchCache.get(queryParams);
    if (cached) {
      console.log('[Cache] HIT for globalSearch');
      return cached;
    }

    console.log('[Cache] MISS for globalSearch');
    const { data } = await http.get('/global-search', { params: queryParams });
    const result = JSON.stringify(data);

    // M2: Cache the result
    globalSearchCache.set(queryParams, result);

    return result;
  } catch (error) {
    console.error('globalSearch error:', error.message);
    console.error('globalSearch error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        params: error.config?.params,
      },
    });

    if (error.response?.status === 404) {
      return JSON.stringify({
        restaurants: [],
        pagination: { totalRestaurants: 0 },
      });
    }

    throw new Error(`Global search failed: ${error.message}`);
  }
}

async function getRestaurantDetails(params) {
  try {
    const { restaurantId, restaurantName, includeWorkingHours = true } = params;
    if (!restaurantId && restaurantName) {
      let searchResult = await globalSearch({
        query: restaurantName,
        limit: 1,
      });
      let searchData = JSON.parse(searchResult);

      if (!searchData.restaurants || searchData.restaurants.length === 0) {
        const cleanedName = restaurantName
          .replace(
            /\b(restoran|restaurant|caffe|cafe|pizzeria|club|bar|grill)\b/gi,
            '',
          )
          .trim();

        if (cleanedName && cleanedName !== restaurantName) {
          console.log(
            `[RestaurantDetails] Retrying with cleaned name: "${cleanedName}"`,
          );
          searchResult = await globalSearch({ query: cleanedName, limit: 1 });
          searchData = JSON.parse(searchResult);
        }
      }

      if (!searchData.restaurants || searchData.restaurants.length === 0) {
        return JSON.stringify({
          error: 'Restaurant not found',
          restaurantName,
        });
      }

      const resolvedId = searchData.restaurants[0].id;
      return getRestaurantDetails({
        restaurantId: resolvedId,
        includeWorkingHours,
      });
    }

    if (!restaurantId) {
      throw new Error('Restaurant ID is required');
    }

    const { data } = await http.get(`/details/${restaurantId}`, {
      params: { includeWorkingHours },
    });

    return JSON.stringify(data);
  } catch (error) {
    console.error('getRestaurantDetails error:', error.message);

    if (error.response?.status === 404) {
      return JSON.stringify({
        error: 'Restaurant not found',
        restaurantId: params.restaurantId,
      });
    }

    throw new Error(`Restaurant details fetch failed: ${error.message}`);
  }
}

async function getMenuItems(params) {
  try {
    const {
      restaurantId,
      restaurantName,
      terms = [],
      includeFood = true,
      includeDrinks = true,
      limit = 20,
      offset = 0,
    } = params;

    if (!restaurantId && restaurantName) {
      let searchResult = await globalSearch({
        query: restaurantName,
        limit: 1,
      });
      let searchData = JSON.parse(searchResult);

      if (!searchData.restaurants || searchData.restaurants.length === 0) {
        const cleanedName = restaurantName
          .replace(
            /\b(restoran|restaurant|caffe|cafe|pizzeria|club|bar|grill)\b/gi,
            '',
          )
          .trim();

        if (cleanedName && cleanedName !== restaurantName) {
          console.log(
            `[MenuItems] Retrying with cleaned name: "${cleanedName}"`,
          );
          searchResult = await globalSearch({ query: cleanedName, limit: 1 });
          searchData = JSON.parse(searchResult);
        }
      }

      if (!searchData.restaurants || searchData.restaurants.length === 0) {
        return JSON.stringify({
          error: 'Restaurant not found',
          restaurantName,
          items: [],
          meta: { count: 0, totalCount: 0 },
        });
      }

      const resolvedId = searchData.restaurants[0].id;
      return getMenuItems({
        restaurantId: resolvedId,
        terms,
        includeFood,
        includeDrinks,
        limit,
        offset,
      });
    }

    if (!restaurantId) {
      throw new Error('Restaurant ID is required');
    }

    const body = {
      restaurantId,
      query: terms.join(' '),
      includeFood,
      includeDrinks,
      sort: 'relevance',
      limit,
      offset,
    };

    const { data } = await http.post('/ai/search/menu', body);
    return JSON.stringify(data);
  } catch (error) {
    console.error('getMenuItems error:', error.message);

    if (error.response?.status === 404) {
      return JSON.stringify({
        error: 'Menu not found',
        restaurantId: params.restaurantId,
        items: [],
        meta: { count: 0, totalCount: 0 },
      });
    }

    throw new Error(`Menu search failed: ${error.message}`);
  }
}

async function executeToolCall(toolName, args) {
  const handlers = {
    resolve_taxonomies: () => resolveTaxonomies(args.text, args.locale),
    global_search: () => globalSearch(args),
    get_full_restaurant_details: () => getRestaurantDetails(args),
    get_menu_items: () => getMenuItems(args),
  };

  const handler = handlers[toolName];
  if (!handler) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  return await handler();
}

module.exports = {
  resolveTaxonomies,
  globalSearch,
  getRestaurantDetails,
  getMenuItems,
  executeToolCall,
};
