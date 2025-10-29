const { Op, Sequelize } = require('sequelize');
const { getMediaUrl } = require('../../config/cdn');
const {
  MenuItem,
  DrinkItem,
  Restaurant,
  MenuItemTranslation,
  DrinkItemTranslation,
  PriceCategory,
  AnalyticsEvent,
  UserFavorite,
} = require('../../models');
const { calculateDistance } = require('../../utils/distance');

// ----------------- Lightweight cache for viewCounts -----------------
let viewCountsCache = {
  fetchedAt: 0,
  data: new Map(),
};
const VIEW_COUNTS_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function getCachedViewCounts() {
  const now = Date.now();
  if (now - viewCountsCache.fetchedAt < VIEW_COUNTS_TTL_MS) {
    return viewCountsCache.data;
  }
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const rows = await AnalyticsEvent.findAll({
    attributes: [
      'restaurant_id',
      [
        Sequelize.fn(
          'COUNT',
          Sequelize.fn('DISTINCT', Sequelize.col('session_id')),
        ),
        'userCount',
      ],
    ],
    where: {
      event_type: 'restaurant_view',
      session_id: { [Op.ne]: null },
      timestamp: { [Op.gte]: weekAgo },
    },
    group: ['restaurant_id'],
  });
  const map = new Map();
  rows.forEach((item) => {
    map.set(item.restaurant_id, parseInt(item.get('userCount'), 10));
  });
  viewCountsCache = { fetchedAt: now, data: map };
  return map;
}

// ----------------- Helpers for matching & scoring -----------------
function normalizeText(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Helper za SQL upite sa normalizacijom dijakritika
// Normalizuje i kolonu u bazi i search term prije poređenja
function createNormalizedLikeCondition(column, searchTerm) {
  const normalizedTerm = normalizeText(searchTerm);

  // Koristi PostgreSQL TRANSLATE za uklanjanje dijakritika
  // TRANSLATE(mapira svaki karakter iz prvog stringa u odgovarajući karakter iz drugog)
  const columnRef = Sequelize.col(column);
  // Koristimo CAST da osiguramo da je tekst
  const columnText = Sequelize.fn('CAST', columnRef, Sequelize.literal('TEXT'));

  // Nested TRANSLATE pozivi za sve dijakritike
  const columnNormalized = Sequelize.fn(
    'LOWER',
    Sequelize.fn(
      'TRANSLATE',
      Sequelize.fn(
        'TRANSLATE',
        Sequelize.fn(
          'TRANSLATE',
          Sequelize.fn(
            'TRANSLATE',
            Sequelize.fn(
              'TRANSLATE',
              Sequelize.fn(
                'TRANSLATE',
                Sequelize.fn(
                  'TRANSLATE',
                  Sequelize.fn(
                    'TRANSLATE',
                    Sequelize.fn('TRANSLATE', columnText, 'čćČĆ', 'ccCC'),
                    'đĐ',
                    'dD',
                  ),
                  'šŠ',
                  'sS',
                ),
                'žŽ',
                'zZ',
              ),
              'àáâãäåÀÁÂÃÄÅ',
              'aaaaaaAAAAAA',
            ),
            'èéêëÈÉÊË',
            'eeeeEEEE',
          ),
          'ìíîïÌÍÎÏ',
          'iiiiIIII',
        ),
        'òóôõöÒÓÔÕÖ',
        'oooooOOOOO',
      ),
      'ùúûüýÿÙÚÛÜÝŸ',
      'uuuuyyUUUUYY',
    ),
  );

  return Sequelize.where(columnNormalized, {
    [Op.like]: `%${normalizedTerm}%`,
  });
}

function computeTokenSimilarity(term, token) {
  if (!term || !token) return 0;
  if (term === token) return 1.0; // exact token match
  if (token.startsWith(term)) return 0.92; // prefix match
  if (token.includes(term)) return 0.75; // substring match
  return 0;
}

// Lightweight Levenshtein (at most 1) for fuzzy matching
function isLevenshteinAtMostOne(a, b) {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (edits === 1) return false;
    edits++;
    if (la > lb) {
      i++;
    } else if (lb > la) {
      j++;
    } else {
      i++;
      j++;
    }
  }
  if (i < la || j < lb) edits++;
  return edits <= 1;
}

function computeSimilarity(termRaw, textRaw) {
  const term = normalizeText(termRaw);
  const text = normalizeText(textRaw);
  if (!term || !text) return 0;

  // token-based similarity first for exact/prefix/substring evaluation
  const tokens = text.split(/[^a-z0-9]+/g).filter(Boolean);
  let best = 0;
  for (const token of tokens) {
    let sim = computeTokenSimilarity(term, token);
    // fuzzy prefix (Levenshtein <= 1) for tokens length >= 5
    if (sim < 0.92 && term.length >= 5 && token.length >= term.length) {
      const tokenPrefix = token.slice(0, term.length);
      if (isLevenshteinAtMostOne(term, tokenPrefix)) {
        sim = Math.max(sim, 0.85);
      }
    }
    best = Math.max(best, sim);
    if (best === 1) break;
  }
  // phrase-level contains for multi-word queries (e.g., "onion ring" in "onion rings")
  if (best < 0.92) {
    const phrase = term.trim().replace(/\s+/g, ' ');
    if (phrase && text.includes(phrase)) {
      best = Math.max(best, 0.9);
    } else if (phrase) {
      // simple singular/plural toggle boost
      if (phrase.endsWith('s') && phrase.length > 1) {
        const singular = phrase.slice(0, -1);
        if (text.includes(singular)) best = Math.max(best, 0.88);
      } else {
        const plural = `${phrase}s`;
        if (text.includes(plural)) best = Math.max(best, 0.88);
      }
    }
  }
  // exact word presence via helper provides a strong boost when not already exact
  if (best < 1 && isExactWordMatch(termRaw, textRaw)) {
    best = Math.max(best, 0.95);
  }
  return best;
}

function isExactWordMatch(termRaw, textRaw) {
  const term = normalizeText(termRaw);
  const text = normalizeText(textRaw);
  if (!term || !text) return false;
  const wordBoundary = new RegExp(
    `\\b${term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`,
    'i',
  );
  return wordBoundary.test(text);
}

module.exports = {
  async globalSearch(req, res) {
    const {
      query,
      latitude,
      longitude,
      sortBy = 'distance', // Default sort
      priceCategoryIds,
      establishmentTypeIds,
      mealTypeIds,
      foodTypeIds,
      establishmentPerkIds,
      dietaryTypeIds,
      minRating,
      mode,
      radiusKm = 10,
      limit = 3000,
      fields = 'min',
    } = req.query;

    const userId = req.user?.id;

    const searchTerms = query
      ? query
          .split(',')
          .map((term) => term.trim())
          .filter((term) => term && term.length > 0) // Filter out empty strings, spaces, and undefined
      : [];
    const hasComma = !!(query && query.includes(','));
    const computedSortBy =
      searchTerms.length > 0 ? req.query.sortBy || 'match_score' : sortBy;

    try {
      const hasCoordinates =
        typeof latitude !== 'undefined' && typeof longitude !== 'undefined';
      const MAX_SEARCH_DISTANCE_KM = 60;
      // Get user favorites if authenticated
      let userFavorites = new Set();
      if (userId) {
        const favorites = await UserFavorite.findAll({
          where: { userId },
          attributes: ['restaurantId'],
        });
        userFavorites = new Set(favorites.map((f) => f.restaurantId));
      }

      // Base restaurant query - maknuti sve include-ove osim PriceCategory
      let restaurantQuery = {
        attributes: [
          'id',
          'name',
          'description',
          'address',
          'place',
          'latitude',
          'longitude',
          'phone',
          'rating',
          'priceLevel',
          'thumbnailUrl',
          'slug',
          'isClaimed',
          'priceCategoryId',
          'createdAt',
        ],
        where: {
          // Uvijek vraćamo samo claimane (partnerske) restorane
          isClaimed: true,
        },
        include: [
          {
            model: PriceCategory,
            attributes: ['id', 'nameEn', 'nameHr', 'icon'],
            required: false,
            as: 'priceCategory',
          },
        ],
      };

      // Dodaj filter za ocjene
      if (minRating) {
        let ratingThreshold;
        const cleanRating = minRating.trim();
        console.log(
          'Received minRating:',
          minRating,
          'Length:',
          minRating.length,
        );
        console.log(
          'Cleaned minRating:',
          cleanRating,
          'Length:',
          cleanRating.length,
        );

        switch (cleanRating) {
          case '3':
            ratingThreshold = 3.0;
            break;
          case '4':
            ratingThreshold = 4.5;
            break;
          case '4.5':
            ratingThreshold = 4.5;
            break;
          case '4.8':
            ratingThreshold = 4.8;
            break;
          default:
            ratingThreshold = null;
        }

        if (ratingThreshold !== null) {
          restaurantQuery.where.rating = {
            [Op.gte]: ratingThreshold,
          };
        }
      }

      // Filtriranje po establishment types
      if (establishmentTypeIds) {
        const typeIds = establishmentTypeIds.split(',').map(Number);
        restaurantQuery.where.establishmentTypes = {
          [Op.overlap]: typeIds,
        };
      }

      // Filtriranje po meal types
      if (mealTypeIds) {
        const mealIds = mealTypeIds.split(',').map(Number);
        restaurantQuery.where.mealTypes = {
          [Op.overlap]: mealIds,
        };
      }

      // Filtriranje po food types
      if (foodTypeIds) {
        const foodIds = foodTypeIds.split(',').map(Number);
        restaurantQuery.where.foodTypes = {
          [Op.overlap]: foodIds,
        };
      }

      // Filtriranje po dietary types
      if (dietaryTypeIds) {
        const dietaryIds = dietaryTypeIds.split(',').map(Number);
        restaurantQuery.where.dietaryTypes = {
          [Op.overlap]: dietaryIds,
        };
      }

      // Add price category filter
      if (priceCategoryIds) {
        const priceIds = priceCategoryIds.split(',').map(Number);
        restaurantQuery.where.priceCategoryId = {
          [Op.and]: [{ [Op.in]: priceIds }, { [Op.not]: null }],
        };
      }

      // Filtriranje po establishment perks
      if (establishmentPerkIds) {
        const perkIds = establishmentPerkIds.split(',').map(Number);
        restaurantQuery.where.establishmentPerks = {
          [Op.overlap]: perkIds,
        };
      }

      // Search by terms if provided
      if (searchTerms.length > 0) {
        // Search in restaurant names - koristimo normalizaciju za dijakritike
        const nameConditions = searchTerms.map((term) =>
          createNormalizedLikeCondition('name', term),
        );

        // Search in menu items - koristimo normalizaciju za dijakritike
        const menuItems = await MenuItemTranslation.findAll({
          where: {
            [Op.or]: searchTerms.map((term) =>
              createNormalizedLikeCondition('name', term),
            ),
          },
          include: [
            {
              model: MenuItem,
              as: 'menuItem',
              required: true,
              where: { isActive: true },
              include: [
                {
                  model: MenuItemTranslation,
                  as: 'translations',
                  attributes: ['language', 'name', 'description'],
                },
              ],
            },
          ],
          limit: 300,
        });

        // Search in drink items - koristimo normalizaciju za dijakritike
        const drinkItems = await DrinkItemTranslation.findAll({
          where: {
            [Op.or]: searchTerms.map((term) =>
              createNormalizedLikeCondition('name', term),
            ),
          },
          include: [
            {
              model: DrinkItem,
              as: 'drinkItem',
              required: true,
              where: { isActive: true },
              include: [
                {
                  model: DrinkItemTranslation,
                  as: 'translations',
                  attributes: ['language', 'name', 'description'],
                },
              ],
            },
          ],
          limit: 300,
        });

        // Get restaurant IDs from menu and drink items
        const menuRestaurantIds = menuItems.map(
          (item) => item.menuItem.restaurantId,
        );
        const drinkRestaurantIds = drinkItems.map(
          (item) => item.drinkItem.restaurantId,
        );

        // Combine all conditions
        restaurantQuery.where[Op.or] = [
          { [Op.or]: nameConditions },
          {
            id: {
              [Op.in]: [
                ...new Set([...menuRestaurantIds, ...drinkRestaurantIds]),
              ],
            },
          },
        ];

        // Build fast lookup for menu/drink items by restaurant
        const menuByRestaurant = new Map();
        menuItems.forEach((mi) => {
          const rid = mi.menuItem.restaurantId;
          if (!menuByRestaurant.has(rid)) menuByRestaurant.set(rid, []);
          menuByRestaurant.get(rid).push(mi);
        });
        const drinkByRestaurant = new Map();
        drinkItems.forEach((di) => {
          const rid = di.drinkItem.restaurantId;
          if (!drinkByRestaurant.has(rid)) drinkByRestaurant.set(rid, []);
          drinkByRestaurant.get(rid).push(di);
        });

        // Get candidate restaurants with all data
        const finalRestaurants = await Restaurant.findAll(restaurantQuery);

        // Fallback: ensure restaurants that matched only by name also get their matching items
        // Identify restaurants that currently have no matched items due to global limits on initial item queries
        const existingItemRestaurantIdSet = new Set([
          ...menuItems.map((i) => i.menuItem.restaurantId),
          ...drinkItems.map((i) => i.drinkItem.restaurantId),
        ]);
        const fallbackRestaurantIds = finalRestaurants
          .filter((r) => !existingItemRestaurantIdSet.has(r.id))
          .map((r) => r.id);

        if (fallbackRestaurantIds.length > 0) {
          // Fetch matching MenuItems for these restaurants - koristimo normalizaciju
          const fallbackMenuItems = await MenuItemTranslation.findAll({
            where: {
              [Op.or]: searchTerms.map((term) =>
                createNormalizedLikeCondition('name', term),
              ),
            },
            include: [
              {
                model: MenuItem,
                as: 'menuItem',
                required: true,
                where: {
                  isActive: true,
                  restaurantId: { [Op.in]: fallbackRestaurantIds },
                },
                include: [
                  {
                    model: MenuItemTranslation,
                    as: 'translations',
                    attributes: ['language', 'name', 'description'],
                  },
                ],
              },
            ],
          });

          // Fetch matching DrinkItems for these restaurants - koristimo normalizaciju
          const fallbackDrinkItems = await DrinkItemTranslation.findAll({
            where: {
              [Op.or]: searchTerms.map((term) =>
                createNormalizedLikeCondition('name', term),
              ),
            },
            include: [
              {
                model: DrinkItem,
                as: 'drinkItem',
                required: true,
                where: {
                  isActive: true,
                  restaurantId: { [Op.in]: fallbackRestaurantIds },
                },
                include: [
                  {
                    model: DrinkItemTranslation,
                    as: 'translations',
                    attributes: ['language', 'name', 'description'],
                  },
                ],
              },
            ],
          });

          // Merge fallbacks into the per-restaurant maps so items are available for scoring and chips
          fallbackMenuItems.forEach((mi) => {
            const rid = mi.menuItem.restaurantId;
            if (!menuByRestaurant.has(rid)) menuByRestaurant.set(rid, []);
            menuByRestaurant.get(rid).push(mi);
          });
          fallbackDrinkItems.forEach((di) => {
            const rid = di.drinkItem.restaurantId;
            if (!drinkByRestaurant.has(rid)) drinkByRestaurant.set(rid, []);
            drinkByRestaurant.get(rid).push(di);
          });
        }

        // Get cached popularity map
        const viewCountMap = await getCachedViewCounts();

        // Calculate distance and prepare final response with smart scoring
        const restaurantsWithMetrics = finalRestaurants.map((restaurant) => {
          const distance = calculateDistance(
            parseFloat(latitude),
            parseFloat(longitude),
            restaurant.latitude,
            restaurant.longitude,
          );

          const viewCount = viewCountMap.get(restaurant.id) || 0;
          const isPopular = viewCount >= 5;
          const isNew =
            restaurant.isClaimed &&
            restaurant.createdAt >=
              new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

          // Per-term similarities
          const nameSims = {};
          const menuBestSims = {};
          let menuCoverageMatched = 0;
          const MENU_COVERAGE_THRESHOLD = 0.8; // require strong menu match
          const NAME_STRICT_THRESHOLD = 0.8;
          const tokensName = normalizeText(restaurant.name);

          for (const term of searchTerms) {
            const nameSim = computeSimilarity(term, tokensName);
            nameSims[term] = nameSim;

            // Best menu similarity for this restaurant and term
            let bestMenuSim = 0;
            const listA = menuByRestaurant.get(restaurant.id) || [];
            const listB = drinkByRestaurant.get(restaurant.id) || [];
            for (const mi of listA) {
              bestMenuSim = Math.max(
                bestMenuSim,
                computeSimilarity(term, mi.name),
              );
              if (bestMenuSim === 1) break;
            }
            if (bestMenuSim < 1) {
              for (const di of listB) {
                bestMenuSim = Math.max(
                  bestMenuSim,
                  computeSimilarity(term, di.name),
                );
                if (bestMenuSim === 1) break;
              }
            }
            menuBestSims[term] = bestMenuSim;
            if (bestMenuSim >= MENU_COVERAGE_THRESHOLD)
              menuCoverageMatched += 1;
          }

          // Build matchedItems chips (aggregate by item, attach both translations)
          const groupedByItem = new Map();
          const listA = menuByRestaurant.get(restaurant.id) || [];
          const listB = drinkByRestaurant.get(restaurant.id) || [];

          const computeItemMaxSim = (translations, fallbackName) => {
            let s = 0;
            const pool =
              translations && translations.length
                ? translations
                : [{ name: fallbackName }];
            for (const tr of pool) {
              for (const term of searchTerms) {
                s = Math.max(s, computeSimilarity(term, tr.name));
                if (s === 1) break;
              }
              if (s === 1) break;
            }
            return s;
          };

          for (const mi of listA) {
            const itemId = mi.menuItem.id;
            const allTr = mi.menuItem.translations || [];
            const sim = computeItemMaxSim(allTr, mi.name);
            if (sim >= 0.6) {
              const priceVal =
                mi.menuItem.price != null
                  ? parseFloat(mi.menuItem.price)
                  : null;
              const trMap = {};
              (allTr.length
                ? allTr
                : [
                    {
                      language: mi.language,
                      name: mi.name,
                      description: mi.description,
                    },
                  ]
              ).forEach((t) => {
                if (t.language)
                  trMap[t.language] = {
                    name: t.name,
                    description: t.description || null,
                  };
              });
              const existing = groupedByItem.get(itemId);
              if (!existing || sim > existing.sim) {
                groupedByItem.set(itemId, {
                  id: itemId,
                  type: 'food',
                  price: priceVal,
                  imageUrl: getMediaUrl(mi.menuItem.imageUrl, 'image'),
                  translations: trMap,
                  sim,
                });
              } else {
                existing.translations = { ...existing.translations, ...trMap };
              }
            }
          }
          for (const di of listB) {
            const itemId = di.drinkItem.id;
            const allTr = di.drinkItem.translations || [];
            const sim = computeItemMaxSim(allTr, di.name);
            if (sim >= 0.6) {
              const priceVal =
                di.drinkItem.price != null
                  ? parseFloat(di.drinkItem.price)
                  : null;
              const trMap = {};
              (allTr.length
                ? allTr
                : [
                    {
                      language: di.language,
                      name: di.name,
                      description: di.description,
                    },
                  ]
              ).forEach((t) => {
                if (t.language)
                  trMap[t.language] = {
                    name: t.name,
                    description: t.description || null,
                  };
              });
              const existing = groupedByItem.get(itemId);
              if (!existing || sim > existing.sim) {
                groupedByItem.set(itemId, {
                  id: itemId,
                  type: 'drink',
                  price: priceVal,
                  imageUrl: getMediaUrl(di.drinkItem.imageUrl, 'image'),
                  translations: trMap,
                  sim,
                });
              } else {
                existing.translations = { ...existing.translations, ...trMap };
              }
            }
          }

          const itemCandidates = Array.from(groupedByItem.values());
          itemCandidates.sort((a, b) => b.sim - a.sim);
          const matchedItems = itemCandidates.slice(0, 5).map((it) => ({
            id: it.id,
            price: it.price != null ? Number(it.price.toFixed(2)) : null,
            type: it.type,
            imageUrl: it.imageUrl || null,
            translations: it.translations,
          }));

          // Determine matchType and smartScore
          let matchType = 'none';
          const distanceWeight = 1 / (1 + (isFinite(distance) ? distance : 0)); // 0..1
          const popularityBoost = Math.log1p(viewCount) / 5; // ~0..small
          const ratingBoost = (restaurant.rating || 0) / 5; // 0..1

          let smartScore = 0;
          if (hasComma && searchTerms.length > 1) {
            // Multi-term: prioritize menu coverage strictly
            const coverage = menuCoverageMatched;
            const coverageScore =
              searchTerms.length > 0
                ? searchTerms.reduce(
                    (acc, t) => acc + (menuBestSims[t] || 0),
                    0,
                  ) / searchTerms.length
                : 0;
            const nameAvg =
              searchTerms.length > 0
                ? searchTerms.reduce((acc, t) => acc + (nameSims[t] || 0), 0) /
                  searchTerms.length
                : 0;
            matchType =
              coverage > 0 && nameAvg > 0
                ? 'mixed'
                : coverage > 0
                  ? 'menu'
                  : nameAvg > 0
                    ? 'name'
                    : 'none';
            const topItemBoost = matchedItems.length
              ? itemCandidates[0].sim * 25
              : 0;
            const lowNamePenalty = nameAvg < 0.2 ? 20 : 0;
            smartScore =
              coverage * 1000 + // hard group separation 2/2 > 1/2 > 0/2
              coverageScore * 100 +
              nameAvg * 60 +
              distanceWeight * 6 +
              popularityBoost * 2.5 +
              ratingBoost * 3 +
              topItemBoost +
              (userFavorites.has(restaurant.id) ? 1 : 0) -
              lowNamePenalty;
          } else {
            // Single-term: fair comparison between menu and name
            const term = searchTerms[0];
            const menuSim = menuBestSims[term] || 0;
            const nameSim = nameSims[term] || 0;
            const isMenuStrong = menuSim >= NAME_STRICT_THRESHOLD;
            const isNameStrong = nameSim >= NAME_STRICT_THRESHOLD;
            matchType =
              isMenuStrong && isNameStrong
                ? 'mixed'
                : menuSim >= nameSim
                  ? 'menu'
                  : 'name';
            // Penalize missing dimension by averaging both signals
            const core = (menuSim + nameSim) / 2;
            const topItemBoost = matchedItems.length
              ? itemCandidates[0].sim * 30
              : 0;
            smartScore =
              core * 100 +
              distanceWeight * 12 +
              popularityBoost * 2 +
              ratingBoost * 3 +
              topItemBoost +
              (userFavorites.has(restaurant.id) ? 2 : 0);

            // Attach core to the restaurant object for FE visibility
            restaurant._singleTermCore = core;
          }

          // Build reason signal
          let topItemName = null;
          if (matchedItems.length) {
            // pick any translation: prefer 'hr', then 'en', else first
            const tr = matchedItems[0].translations || {};
            topItemName =
              tr.hr?.name || tr.en?.name || Object.values(tr)[0]?.name || null;
          }

          return {
            ...restaurant.toJSON(),
            distance,
            isPopular,
            isNew,
            isFavorite: userFavorites.has(restaurant.id),
            smartScore,
            matchType,
            reason: { basis: matchType, topItemName },
            menuCoverage: {
              matchedCount: menuCoverageMatched,
              totalTerms: searchTerms.length,
            },
            perTerm: { nameSims, menuBestSims },
            matchedItems,
            ...(searchTerms.length === 1
              ? { core: restaurant._singleTermCore }
              : {}),
          };
        });

        // Apply default radius filter for main (non-map) search
        let listForDisplay = restaurantsWithMetrics;
        if (hasCoordinates) {
          listForDisplay = listForDisplay.filter(
            (r) => isFinite(r.distance) && r.distance <= MAX_SEARCH_DISTANCE_KM,
          );
        }

        // Sort results: smart by default when searching, support existing sortBy
        if (hasComma && searchTerms.length > 1) {
          // First by menu coverage group, then by smartScore desc
          listForDisplay.sort((a, b) => {
            const covA = a.menuCoverage?.matchedCount || 0;
            const covB = b.menuCoverage?.matchedCount || 0;
            if (covB !== covA) return covB - covA;
            return b.smartScore - a.smartScore;
          });
        } else {
          switch (computedSortBy) {
            case 'rating':
              listForDisplay.sort((a, b) => b.rating - a.rating);
              break;
            case 'distance':
              listForDisplay.sort((a, b) => a.distance - b.distance);
              break;
            case 'distance_rating':
              listForDisplay.sort((a, b) => {
                const scoreA = (a.rating * 5) / (a.distance + 1); // +1 to avoid division by zero
                const scoreB = (b.rating * 5) / (b.distance + 1);
                return scoreB - scoreA;
              });
              break;
            case 'core':
              listForDisplay.sort((a, b) => (b.core || 0) - (a.core || 0));
              break;
            case 'match_score':
            default:
              listForDisplay.sort((a, b) => b.smartScore - a.smartScore);
          }
        }

        // If map mode, return GeoJSON format
        if (mode === 'map') {
          const radiusMeters = parseFloat(radiusKm) * 1000;
          const maxLimit = Math.min(parseInt(limit) || 3000, 3000);

          // Filter by radius and apply limit
          const filteredRestaurants = restaurantsWithMetrics
            .filter((restaurant) => restaurant.distance <= radiusMeters / 1000)
            .slice(0, maxLimit);

          // Create GeoJSON response
          const geojson = {
            type: 'FeatureCollection',
            features: filteredRestaurants.map((restaurant) => ({
              type: 'Feature',
              id: restaurant.id,
              properties:
                fields === 'min'
                  ? {
                      id: restaurant.id,
                      isPopular: restaurant.isPopular,
                      isNew: restaurant.isNew,
                      isClaimed: restaurant.isClaimed,
                      isFavorite: restaurant.isFavorite,
                    }
                  : {
                      id: restaurant.id,
                      name: restaurant.name,
                      isPopular: restaurant.isPopular,
                      isNew: restaurant.isNew,
                      isClaimed: restaurant.isClaimed,
                      isFavorite: restaurant.isFavorite,
                    },
              geometry: {
                type: 'Point',
                coordinates: [restaurant.longitude, restaurant.latitude], // GeoJSON uses [lng, lat]
              },
            })),
          };

          // Extract IDs in the same order for sync with list/carousel
          const ids = filteredRestaurants.map((restaurant) => restaurant.id);

          return res.json({
            geojson,
            ids,
            meta: {
              count: filteredRestaurants.length,
              truncated: filteredRestaurants.length >= maxLimit,
              radiusKm: parseFloat(radiusKm),
              source: 'search',
            },
          });
        }

        // Implement pagination for regular mode
        const page = parseInt(req.query.page) || 1;
        const pageLimit = 20;
        const startIndex = (page - 1) * pageLimit;
        const endIndex = page * pageLimit;

        const paginatedRestaurants = listForDisplay.slice(startIndex, endIndex);
        const totalPages = Math.ceil(listForDisplay.length / pageLimit);

        const responsePayload = {
          restaurants: paginatedRestaurants.map((r) => ({
            ...r,
            thumbnailUrl: r.thumbnailUrl
              ? getMediaUrl(r.thumbnailUrl, 'image')
              : null,
          })),
          pagination: {
            currentPage: page,
            totalPages,
            totalRestaurants: listForDisplay.length,
          },
        };
        return res.json(responsePayload);
      }

      // If no search terms, just return filtered restaurants
      const restaurants = await Restaurant.findAll(restaurantQuery);

      // Get cached popularity map
      const viewCountMap = await getCachedViewCounts();

      const restaurantsWithDistance = restaurants.map((restaurant) => {
        const distance = calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          restaurant.latitude,
          restaurant.longitude,
        );

        // Calculate isPopular based on AnalyticsEvent data
        const viewCount = viewCountMap.get(restaurant.id) || 0;
        const isPopular = viewCount >= 5; // Restoran je popularan ako je imao 5+ unique posjeta u zadnjih 7 dana

        const isNew =
          restaurant.isClaimed &&
          restaurant.createdAt >=
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        return {
          ...restaurant.toJSON(),
          distance,
          isPopular,
          isNew,
          isFavorite: userFavorites.has(restaurant.id),
        };
      });

      // Apply default radius filter for main (non-map) search
      let listForDisplay = restaurantsWithDistance;
      if (hasCoordinates) {
        listForDisplay = listForDisplay.filter(
          (r) => isFinite(r.distance) && r.distance <= MAX_SEARCH_DISTANCE_KM,
        );
      }

      // Sort results based on sortBy parameter
      switch (sortBy) {
        case 'rating':
          listForDisplay.sort((a, b) => b.rating - a.rating);
          break;
        case 'distance':
          listForDisplay.sort((a, b) => a.distance - b.distance);
          break;
        case 'distance_rating':
          listForDisplay.sort((a, b) => {
            const scoreA = (a.rating * 5) / (a.distance + 1);
            const scoreB = (b.rating * 5) / (b.distance + 1);
            return scoreB - scoreA;
          });
          break;
        default:
          listForDisplay.sort((a, b) => a.distance - b.distance);
      }

      // If map mode, return GeoJSON format
      if (mode === 'map') {
        const radiusMeters = parseFloat(radiusKm) * 1000;
        const maxLimit = Math.min(parseInt(limit) || 3000, 3000);

        // Filter by radius and apply limit
        const filteredRestaurants = restaurantsWithDistance
          .filter((restaurant) => restaurant.distance <= radiusMeters / 1000)
          .slice(0, maxLimit);

        // Create GeoJSON response
        const geojson = {
          type: 'FeatureCollection',
          features: filteredRestaurants.map((restaurant) => ({
            type: 'Feature',
            id: restaurant.id,
            properties:
              fields === 'min'
                ? {
                    id: restaurant.id,
                    isPopular: restaurant.isPopular,
                    isNew: restaurant.isNew,
                    isClaimed: restaurant.isClaimed,
                    isFavorite: restaurant.isFavorite,
                  }
                : {
                    id: restaurant.id,
                    name: restaurant.name,
                    isPopular: restaurant.isPopular,
                    isNew: restaurant.isNew,
                    isClaimed: restaurant.isClaimed,
                    isFavorite: restaurant.isFavorite,
                  },
            geometry: {
              type: 'Point',
              coordinates: [restaurant.longitude, restaurant.latitude], // GeoJSON uses [lng, lat]
            },
          })),
        };

        // Extract IDs in the same order for sync with list/carousel
        const ids = filteredRestaurants.map((restaurant) => restaurant.id);

        return res.json({
          geojson,
          ids,
          meta: {
            count: filteredRestaurants.length,
            truncated: filteredRestaurants.length >= maxLimit,
            radiusKm: parseFloat(radiusKm),
            source: 'search',
          },
        });
      }

      // Implement pagination for regular mode
      const page = parseInt(req.query.page) || 1;
      const pageLimit = 20;
      const startIndex = (page - 1) * pageLimit;
      const endIndex = page * pageLimit;

      const paginatedRestaurants = listForDisplay.slice(startIndex, endIndex);
      const totalPages = Math.ceil(listForDisplay.length / pageLimit);

      const responsePayload2 = {
        restaurants: paginatedRestaurants.map((r) => ({
          ...r,
          thumbnailUrl: r.thumbnailUrl
            ? getMediaUrl(r.thumbnailUrl, 'image')
            : null,
        })),
        pagination: {
          currentPage: page,
          totalPages,
          totalRestaurants: listForDisplay.length,
        },
      };
      return res.json(responsePayload2);
    } catch (error) {
      console.error('Search error:', error);
      return res
        .status(500)
        .json({ error: 'An error occurred during the search.' });
    }
  },
};
