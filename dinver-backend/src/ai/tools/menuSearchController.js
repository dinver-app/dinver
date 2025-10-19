'use strict';

const db = require('../../../models');
const { Op } = require('sequelize');
const { getMediaUrl } = require('../../../config/cdn');
const { createEnhancedSearchVariations } = require('./utils/variations');
const {
  createILIKEConditions,
  calculateItemScore,
  getItemPrice,
} = require('./utils/searchTextHelper');

const MAX_LIMIT = 50;

async function searchMatchingCategories(
  restaurantId,
  searchTerms,
  includeFood,
) {
  if (!searchTerms || searchTerms.length === 0) {
    return [];
  }

  const CategoryModel = includeFood ? db.MenuCategory : db.DrinkCategory;
  const TranslationModel = includeFood
    ? db.MenuCategoryTranslation
    : db.DrinkCategoryTranslation;

  const matchingCategories = await CategoryModel.findAll({
    where: { restaurantId, isActive: true },
    include: [
      {
        model: TranslationModel,
        as: 'translations',
        attributes: ['language', 'name', 'description'],
        where: createILIKEConditions(
          { Op, sequelize: db.sequelize },
          'translations',
          ['name', 'description'],
          searchTerms,
        ),
        required: true,
      },
    ],
    attributes: ['id'],
  });

  return matchingCategories.map((cat) => cat.id);
}

async function searchMenuItemsByText(restaurantId, searchTerms, includeFood) {
  const Model = includeFood ? db.MenuItem : db.DrinkItem;
  const TranslationModel = includeFood
    ? db.MenuItemTranslation
    : db.DrinkItemTranslation;

  const includeOptions = [
    {
      model: TranslationModel,
      as: 'translations',
      attributes: ['language', 'name', 'description'],
      where: createILIKEConditions(
        { Op, sequelize: db.sequelize },
        'translations',
        ['name', 'description'],
        searchTerms,
      ),
      required: true,
    },
  ];

  if (includeFood) {
    includeOptions.push({
      model: db.MenuItemSize,
      as: 'sizes',
      required: false,
      attributes: ['id', 'price', 'isDefault', 'position'],
    });
  }

  return await Model.findAll({
    where: { restaurantId, isActive: true },
    include: includeOptions,
    order: [
      ['position', 'ASC'],
      ['id', 'ASC'],
    ],
    limit: Number(process.env.SEARCH_HARD_LIMIT || 1000),
    distinct: true,
    subQuery: false,
  });
}
async function getItemsByCategory(restaurantId, categoryIds, includeFood) {
  if (categoryIds.length === 0) {
    return [];
  }

  const Model = includeFood ? db.MenuItem : db.DrinkItem;
  const TranslationModel = includeFood
    ? db.MenuItemTranslation
    : db.DrinkItemTranslation;

  const includeOptions = [
    {
      model: TranslationModel,
      as: 'translations',
      attributes: ['language', 'name', 'description'],
      required: false,
    },
  ];

  if (includeFood) {
    includeOptions.push({
      model: db.MenuItemSize,
      as: 'sizes',
      required: false,
      attributes: ['id', 'price', 'isDefault', 'position'],
    });
  }

  return await Model.findAll({
    where: {
      restaurantId,
      categoryId: { [Op.in]: categoryIds },
      isActive: true,
    },
    include: includeOptions,
    order: [
      ['position', 'ASC'],
      ['id', 'ASC'],
    ],
    limit: Number(process.env.SEARCH_HARD_LIMIT || 1000),
    distinct: true,
    subQuery: false,
  });
}

module.exports.searchRestaurantMenuItems =
  async function searchRestaurantMenuItems(req, res) {
    try {
      const {
        restaurantId,
        query = '',
        sort = 'relevance',
        limit = 50,
        offset = 0,
        includeFood = true,
        includeDrinks = true,
      } = req.body || {};

      if (!restaurantId) {
        return res.status(400).json({ error: 'restaurantId is required' });
      }

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(restaurantId)) {
        return res
          .status(400)
          .json({ error: 'restaurantId must be a valid UUID' });
      }

      const validSorts = ['relevance', 'price_asc', 'price_desc'];
      if (sort && !validSorts.includes(sort)) {
        return res.status(400).json({
          error: 'sort must be one of: relevance, price_asc, price_desc',
        });
      }

      if (!includeFood && !includeDrinks) {
        return res
          .status(400)
          .json({ error: 'includeFood or includeDrinks must be true' });
      }

      const cappedLimit = Math.min(Number(limit) || 50, MAX_LIMIT);
      const cappedOffset = Math.max(Number(offset) || 0, 0);

      const hasQuery = typeof query === 'string' && query.trim().length > 0;
      let searchTerms = [];
      if (hasQuery) {
        const { variants } = createEnhancedSearchVariations(query, { max: 10 });
        searchTerms = [query, ...variants].slice(0, 10);
      }

      let foodItems = [];
      let drinkItems = [];

      if (hasQuery) {
        const promises = [];
        let matchingFoodCategoryIds = [];
        let matchingDrinkCategoryIds = [];

        if (includeFood) {
          promises.push(
            searchMatchingCategories(restaurantId, searchTerms, true),
          );
        }
        if (includeDrinks) {
          promises.push(
            searchMatchingCategories(restaurantId, searchTerms, false),
          );
        }

        const categoryResults = await Promise.all(promises);
        let catIndex = 0;
        if (includeFood) {
          matchingFoodCategoryIds = categoryResults[catIndex++];
        }
        if (includeDrinks) {
          matchingDrinkCategoryIds = categoryResults[catIndex++];
        }

        const itemPromises = [];

        if (includeFood) {
          itemPromises.push(
            searchMenuItemsByText(restaurantId, searchTerms, true),
          );
          if (matchingFoodCategoryIds.length > 0) {
            itemPromises.push(
              getItemsByCategory(restaurantId, matchingFoodCategoryIds, true),
            );
          }
        }

        if (includeDrinks) {
          itemPromises.push(
            searchMenuItemsByText(restaurantId, searchTerms, false),
          );
          if (matchingDrinkCategoryIds.length > 0) {
            itemPromises.push(
              getItemsByCategory(restaurantId, matchingDrinkCategoryIds, false),
            );
          }
        }

        const results = await Promise.all(itemPromises);
        let resultIndex = 0;

        if (includeFood) {
          const textMatchedFood = results[resultIndex++];
          const categoryMatchedFood =
            matchingFoodCategoryIds.length > 0 ? results[resultIndex++] : [];

          const foodItemsMap = new Map();
          [...textMatchedFood, ...categoryMatchedFood].forEach((item) => {
            if (!foodItemsMap.has(item.id)) {
              foodItemsMap.set(item.id, item);
            }
          });
          foodItems = Array.from(foodItemsMap.values());
        }

        if (includeDrinks) {
          const textMatchedDrinks = results[resultIndex++];
          const categoryMatchedDrinks =
            matchingDrinkCategoryIds.length > 0 ? results[resultIndex++] : [];

          // Combine and deduplicate by ID
          const drinkItemsMap = new Map();
          [...textMatchedDrinks, ...categoryMatchedDrinks].forEach((item) => {
            if (!drinkItemsMap.has(item.id)) {
              drinkItemsMap.set(item.id, item);
            }
          });
          drinkItems = Array.from(drinkItemsMap.values());
        }
      }

      let allItems = [];
      if (includeFood && includeDrinks) {
        allItems = [
          ...foodItems.map((item) => ({ ...item.toJSON(), type: 'food' })),
          ...drinkItems.map((item) => ({ ...item.toJSON(), type: 'drink' })),
        ];
      } else if (includeFood) {
        allItems = foodItems.map((item) => ({
          ...item.toJSON(),
          type: 'food',
        }));
      } else {
        allItems = drinkItems.map((item) => ({
          ...item.toJSON(),
          type: 'drink',
        }));
      }

      const itemsWithScores = allItems.map((item) => ({
        ...item,
        score: calculateItemScore(item, searchTerms),
        calculatedPrice: getItemPrice(item),
      }));

      const sortKey = hasQuery
        ? sort
        : sort === 'price_desc'
          ? 'price_desc'
          : 'price_asc';

      itemsWithScores.sort((a, b) => {
        if (sortKey === 'price_asc') {
          const pa = a.calculatedPrice,
            pb = b.calculatedPrice;
          if (pa == null && pb == null) return 0;
          if (pa == null) return 1;
          if (pb == null) return -1;
          return pa - pb;
        } else if (sortKey === 'price_desc') {
          const pa = a.calculatedPrice,
            pb = b.calculatedPrice;
          if (pa == null && pb == null) return 0;
          if (pa == null) return 1;
          if (pb == null) return -1;
          return pb - pa;
        } else {
          if (b.score !== a.score) return b.score - a.score;
          const pa = a.calculatedPrice,
            pb = b.calculatedPrice;
          if (pa == null && pb == null) return 0;
          if (pa == null) return 1;
          if (pb == null) return -1;
          return pa - pb;
        }
      });

      const paginatedItems = itemsWithScores
        .slice(cappedOffset, cappedOffset + cappedLimit)
        .map((item) => ({
          type: item.type,
          id: item.id,
          restaurantId: item.restaurantId,
          price:
            item.calculatedPrice != null
              ? Number(item.calculatedPrice.toFixed(2))
              : null,
          imageUrl: item.imageUrl ? getMediaUrl(item.imageUrl, 'image') : null,
          translations: {
            hr: {
              name:
                item.translations?.find((t) => t.language === 'hr')?.name || '',
              description:
                item.translations?.find((t) => t.language === 'hr')
                  ?.description || '',
            },
            en: {
              name:
                item.translations?.find((t) => t.language === 'en')?.name || '',
              description:
                item.translations?.find((t) => t.language === 'en')
                  ?.description || '',
            },
          },
          score: item.score,
        }));

      res.json({
        items: paginatedItems,
        meta: {
          restaurantId,
          query: hasQuery ? query : null,
          sort: sortKey,
          limit: cappedLimit,
          offset: cappedOffset,
          count: paginatedItems.length,
          totalCount: itemsWithScores.length,
        },
      });
    } catch (err) {
      console.error('[ai] searchRestaurantMenuItems error:', err);
      res.status(500).json({ error: 'Failed to search restaurant menu items' });
    }
  };
