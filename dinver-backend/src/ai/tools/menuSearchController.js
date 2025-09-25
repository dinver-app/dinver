const db = require('../../../models');
const { Op } = require('sequelize');
const { getMediaUrl } = require('../../../config/cdn');
const { createEnhancedSearchVariations, latinize } = require('./variations');

const MAX_LIMIT = 50;

function normalizeDiacritics(text) {
  return latinize(text?.toLowerCase() || '');
}

function createSearchConditions(searchTerms) {
  if (!searchTerms?.length) return undefined;

  const conditions = [];

  searchTerms.forEach((term) => {
    const cleanTerm = term.replace(/[%_]/g, '');
    const normalizedTerm = normalizeDiacritics(cleanTerm);

    if (cleanTerm) {
      conditions.push(
        { name: { [Op.iLike]: `%${cleanTerm}%` } },
        { description: { [Op.iLike]: `%${cleanTerm}%` } },
      );

      conditions.push(
        db.sequelize.where(
          db.sequelize.fn(
            'LOWER',
            db.sequelize.fn(
              'TRANSLATE',
              db.sequelize.col('translations.name'),
              'čćđšžČĆĐŠŽàáâãäåèéêëìíîïòóôõöùúûüñ',
              'ccdszCCDSZaaaaaaeeeeiiiioooouuuun',
            ),
          ),
          { [Op.iLike]: `%${normalizedTerm}%` },
        ),
        db.sequelize.where(
          db.sequelize.fn(
            'LOWER',
            db.sequelize.fn(
              'TRANSLATE',
              db.sequelize.col('translations.description'),
              'čćđšžČĆĐŠŽàáâãäåèéêëìíîïòóôõöùúûüñ',
              'ccdszCCDSZaaaaaaeeeeiiiioooouuuun',
            ),
          ),
          { [Op.iLike]: `%${normalizedTerm}%` },
        ),
      );
    }
  });

  return { [Op.or]: conditions };
}

function calculateTextScore(text, searchTerms) {
  if (!text || !searchTerms?.length) return 0;

  const normalizedText = normalizeDiacritics(text);
  let score = 0;

  for (const term of searchTerms) {
    const normalizedTerm = normalizeDiacritics(term.replace(/[%_]/g, ''));
    if (normalizedText.includes(normalizedTerm)) {
      score += normalizedTerm.length / text.length;
    }
  }

  return Math.min(score, 1);
}

function exactWordHit(text, term) {
  if (!text || !term) return false;
  const t = latinize(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const normalized = latinize(text);
  return new RegExp(`\\b${t}\\b`, 'i').test(normalized);
}

function calculateItemScore(item, searchTerms) {
  if (!searchTerms?.length) return 0;

  const hrTranslation = item.translations?.find((t) => t.language === 'hr');
  const enTranslation = item.translations?.find((t) => t.language === 'en');

  const nameScoreHr =
    calculateTextScore(hrTranslation?.name, searchTerms) * 1.0;
  const nameScoreEn =
    calculateTextScore(enTranslation?.name, searchTerms) * 1.0;
  const descScoreHr =
    calculateTextScore(hrTranslation?.description, searchTerms) * 0.7;
  const descScoreEn =
    calculateTextScore(enTranslation?.description, searchTerms) * 0.7;

  const exactHr = searchTerms.some((t) => exactWordHit(hrTranslation?.name, t));
  const exactEn = searchTerms.some((t) => exactWordHit(enTranslation?.name, t));
  const exactBoost = exactHr || exactEn ? 0.15 : 0;

  return Math.min(
    1,
    Math.max(nameScoreHr, nameScoreEn, descScoreHr, descScoreEn) + exactBoost,
  );
}

function getItemPrice(item) {
  if (item.price !== null && item.price !== undefined) {
    return Number(parseFloat(item.price).toFixed(2));
  }

  if (item.sizes && item.sizes.length > 0) {
    const validPrices = item.sizes
      .map((size) => Number.parseFloat(size.price))
      .filter(Number.isFinite);

    if (validPrices.length > 0) {
      const minPrice = Math.min(...validPrices);
      return Number(minPrice.toFixed(2));
    }
  }

  return null;
}

async function searchMenuItems(restaurantId, searchTerms, includeFood) {
  const Model = includeFood ? db.MenuItem : db.DrinkItem;
  const TranslationModel = includeFood
    ? db.MenuItemTranslation
    : db.DrinkItemTranslation;

  const includeOptions = [
    {
      model: TranslationModel,
      as: 'translations',
      attributes: ['language', 'name', 'description'],
      where: createSearchConditions(searchTerms),
      required: searchTerms?.length > 0,
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
        const { variants } = createEnhancedSearchVariations(query, {
          max: 10,
        });
        searchTerms = [query, ...variants].slice(0, 10);
      }

      const promises = [];
      if (includeFood) {
        promises.push(searchMenuItems(restaurantId, searchTerms, true));
      }
      if (includeDrinks) {
        promises.push(searchMenuItems(restaurantId, searchTerms, false));
      }

      const results = await Promise.all(promises);
      let allItems = [];

      if (includeFood && includeDrinks) {
        allItems = [
          ...results[0].map((item) => ({ ...item.toJSON(), type: 'food' })),
          ...results[1].map((item) => ({ ...item.toJSON(), type: 'drink' })),
        ];
      } else if (includeFood) {
        allItems = results[0].map((item) => ({
          ...item.toJSON(),
          type: 'food',
        }));
      } else {
        allItems = results[0].map((item) => ({
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
