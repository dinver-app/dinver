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

        // Calculate matching terms for each restaurant
        const restaurantMatches = new Map();

        // Check name matches
        const restaurants = await Restaurant.findAll(restaurantQuery);
        restaurants.forEach((restaurant) => {
          const matches = searchTerms.filter((term) =>
            restaurant.name.toLowerCase().includes(term.toLowerCase()),
          );
          restaurantMatches.set(restaurant.id, {
            matchCount: matches.length,
            matchedTerms: matches,
          });
        });

        // Add menu item matches
        menuItems.forEach((item) => {
          const restaurantId = item.menuItem.restaurantId;
          const currentMatch = restaurantMatches.get(restaurantId) || {
            matchCount: 0,
            matchedTerms: [],
          };
          const term = searchTerms.find((t) =>
            item.name.toLowerCase().includes(t.toLowerCase()),
          );
          if (term && !currentMatch.matchedTerms.includes(term)) {
            currentMatch.matchCount++;
            currentMatch.matchedTerms.push(term);
            restaurantMatches.set(restaurantId, currentMatch);
          }
        });

        // Add drink item matches
        drinkItems.forEach((item) => {
          const restaurantId = item.drinkItem.restaurantId;
          const currentMatch = restaurantMatches.get(restaurantId) || {
            matchCount: 0,
            matchedTerms: [],
          };
          const term = searchTerms.find((t) =>
            item.name.toLowerCase().includes(t.toLowerCase()),
          );
          if (term && !currentMatch.matchedTerms.includes(term)) {
            currentMatch.matchCount++;
            currentMatch.matchedTerms.push(term);
            restaurantMatches.set(restaurantId, currentMatch);
          }
        });

        // Get final restaurants with all data
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

        // Calculate distance and prepare final response
        const restaurantsWithMetrics = finalRestaurants.map((restaurant) => {
          const distance = calculateDistance(
            parseFloat(latitude),
            parseFloat(longitude),
            restaurant.latitude,
            restaurant.longitude,
          );

          const matches = restaurantMatches.get(restaurant.id) || {
            matchCount: 0,
            matchedTerms: [],
          };

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
            matchScore: matches.matchCount / searchTerms.length,
            matchedTerms: matches.matchedTerms,
            totalSearchTerms: searchTerms.length,
            isPopular,
            isNew,
            isFavorite: userFavorites.has(restaurant.id),
          };
        });

        // Sort results based on sortBy parameter
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
            restaurantsWithMetrics.sort((a, b) => b.matchScore - a.matchScore);
            break;
          default:
            restaurantsWithMetrics.sort((a, b) => a.distance - b.distance);
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
