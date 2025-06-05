const { Op } = require('sequelize');
const {
  MenuItem,
  DrinkItem,
  Restaurant,
  MenuItemTranslation,
  DrinkItemTranslation,
  PriceCategory,
} = require('../../models');

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
    } = req.query;

    const searchTerms = query
      ? query
          .split(',')
          .map((term) => term.trim())
          .filter((term) => term && term.length > 0) // Filter out empty strings, spaces, and undefined
      : [];

    try {
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
            ratingThreshold = 4.0;
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

          return {
            ...restaurant.toJSON(),
            distance,
            matchScore: matches.matchCount / searchTerms.length,
            matchedTerms: matches.matchedTerms,
            totalSearchTerms: searchTerms.length,
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

        // Implement pagination
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const paginatedRestaurants = restaurantsWithMetrics.slice(
          startIndex,
          endIndex,
        );
        const totalPages = Math.ceil(restaurantsWithMetrics.length / limit);

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
      const restaurantsWithDistance = restaurants.map((restaurant) => {
        const distance = calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          restaurant.latitude,
          restaurant.longitude,
        );

        return {
          ...restaurant.toJSON(),
          distance,
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

      // Implement pagination
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;

      const paginatedRestaurants = restaurantsWithDistance.slice(
        startIndex,
        endIndex,
      );
      const totalPages = Math.ceil(restaurantsWithDistance.length / limit);

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

// Helper function to calculate distance between coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Radius of the Earth in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
