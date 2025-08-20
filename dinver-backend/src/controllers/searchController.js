const { Op, Sequelize } = require('sequelize');
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

// ----------------- Helpers for matching & scoring -----------------
function normalizeText(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function computeTokenSimilarity(term, token) {
  if (!term || !token) return 0;
  if (term === token) return 1.0; // exact token match
  if (token.startsWith(term)) return 0.92; // prefix match
  if (token.includes(term)) return 0.75; // substring match
  return 0;
}

function computeSimilarity(termRaw, textRaw) {
  const term = normalizeText(termRaw);
  const text = normalizeText(textRaw);
  if (!term || !text) return 0;

  // token-based similarity first for exact/prefix/substring evaluation
  const tokens = text.split(/[^a-z0-9]+/g).filter(Boolean);
  let best = 0;
  for (const token of tokens) {
    best = Math.max(best, computeTokenSimilarity(term, token));
    if (best === 1) break;
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
      onlyClaimedRestaurants,
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

    try {
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
        where: {},
        include: [
          {
            model: PriceCategory,
            attributes: ['id', 'nameEn', 'nameHr', 'icon'],
            required: false,
            as: 'priceCategory',
          },
        ],
      };

      // Filter for claimed restaurants
      if (onlyClaimedRestaurants === 'true') {
        restaurantQuery.where.isClaimed = true;
      }

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
        // Search in restaurant names
        const nameConditions = searchTerms.map((term) => ({
          name: { [Op.iLike]: `%${term}%` },
        }));

        // Search in menu items
        const menuItems = await MenuItemTranslation.findAll({
          where: {
            [Op.or]: searchTerms.map((term) => ({
              name: { [Op.iLike]: `%${term}%` },
            })),
          },
          include: [{ model: MenuItem, as: 'menuItem' }],
        });

        // Search in drink items
        const drinkItems = await DrinkItemTranslation.findAll({
          where: {
            [Op.or]: searchTerms.map((term) => ({
              name: { [Op.iLike]: `%${term}%` },
            })),
          },
          include: [{ model: DrinkItem, as: 'drinkItem' }],
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

        // Get restaurant view counts from AnalyticsEvent for popularity calculation
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const viewCounts = await AnalyticsEvent.findAll({
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
          order: [
            [
              Sequelize.fn(
                'COUNT',
                Sequelize.fn('DISTINCT', Sequelize.col('session_id')),
              ),
              'DESC',
            ],
          ],
        });

        // Create a map of restaurant_id to view count
        const viewCountMap = new Map();
        viewCounts.forEach((item) => {
          viewCountMap.set(
            item.restaurant_id,
            parseInt(item.get('userCount'), 10),
          );
        });

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
            smartScore =
              coverage * 1000 + // hard group separation 2/2 > 1/2 > 0/2
              coverageScore * 100 +
              nameAvg * 50 +
              distanceWeight * 5 +
              popularityBoost * 3 +
              ratingBoost * 3 +
              (userFavorites.has(restaurant.id) ? 1 : 0);
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

            const core =
              Math.max(menuSim, nameSim) + 0.15 * Math.min(menuSim, nameSim);
            smartScore =
              core * 100 +
              distanceWeight * 8 +
              popularityBoost * 4 +
              ratingBoost * 4 +
              (userFavorites.has(restaurant.id) ? 2 : 0);
          }

          return {
            ...restaurant.toJSON(),
            distance,
            isPopular,
            isNew,
            isFavorite: userFavorites.has(restaurant.id),
            smartScore,
            matchType,
            menuCoverage: {
              matchedCount: menuCoverageMatched,
              totalTerms: searchTerms.length,
            },
            perTerm: { nameSims, menuBestSims },
          };
        });

        // Sort results: smart by default when searching, support existing sortBy
        if (hasComma && searchTerms.length > 1) {
          // First by menu coverage group, then by smartScore desc
          restaurantsWithMetrics.sort((a, b) => {
            const covA = a.menuCoverage?.matchedCount || 0;
            const covB = b.menuCoverage?.matchedCount || 0;
            if (covB !== covA) return covB - covA;
            return b.smartScore - a.smartScore;
          });
        } else {
          switch (sortBy) {
            case 'rating':
              restaurantsWithMetrics.sort((a, b) => b.rating - a.rating);
              break;
            case 'distance':
              restaurantsWithMetrics.sort((a, b) => a.distance - b.distance);
              break;
            case 'distance_rating':
              restaurantsWithMetrics.sort((a, b) => {
                const scoreA = (a.rating * 5) / (a.distance + 1); // +1 to avoid division by zero
                const scoreB = (b.rating * 5) / (b.distance + 1);
                return scoreB - scoreA;
              });
              break;
            case 'match_score':
            default:
              restaurantsWithMetrics.sort(
                (a, b) => b.smartScore - a.smartScore,
              );
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

        const paginatedRestaurants = restaurantsWithMetrics.slice(
          startIndex,
          endIndex,
        );
        const totalPages = Math.ceil(restaurantsWithMetrics.length / pageLimit);

        return res.json({
          restaurants: paginatedRestaurants,
          pagination: {
            currentPage: page,
            totalPages,
            totalRestaurants: restaurantsWithMetrics.length,
          },
        });
      }

      // If no search terms, just return filtered restaurants
      const restaurants = await Restaurant.findAll(restaurantQuery);

      // Get restaurant view counts from AnalyticsEvent for popularity calculation
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const viewCounts = await AnalyticsEvent.findAll({
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
        order: [
          [
            Sequelize.fn(
              'COUNT',
              Sequelize.fn('DISTINCT', Sequelize.col('session_id')),
            ),
            'DESC',
          ],
        ],
      });

      // Create a map of restaurant_id to view count
      const viewCountMap = new Map();
      viewCounts.forEach((item) => {
        viewCountMap.set(
          item.restaurant_id,
          parseInt(item.get('userCount'), 10),
        );
      });

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

      // Sort results based on sortBy parameter
      switch (sortBy) {
        case 'rating':
          restaurantsWithDistance.sort((a, b) => b.rating - a.rating);
          break;
        case 'distance':
          restaurantsWithDistance.sort((a, b) => a.distance - b.distance);
          break;
        case 'distance_rating':
          restaurantsWithDistance.sort((a, b) => {
            const scoreA = (a.rating * 5) / (a.distance + 1);
            const scoreB = (b.rating * 5) / (b.distance + 1);
            return scoreB - scoreA;
          });
          break;
        default:
          restaurantsWithDistance.sort((a, b) => a.distance - b.distance);
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

      const paginatedRestaurants = restaurantsWithDistance.slice(
        startIndex,
        endIndex,
      );
      const totalPages = Math.ceil(restaurantsWithDistance.length / pageLimit);

      return res.json({
        restaurants: paginatedRestaurants,
        pagination: {
          currentPage: page,
          totalPages,
          totalRestaurants: restaurantsWithDistance.length,
        },
      });
    } catch (error) {
      console.error('Search error:', error);
      return res
        .status(500)
        .json({ error: 'An error occurred during the search.' });
    }
  },
};
