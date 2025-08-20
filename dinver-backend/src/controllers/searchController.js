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

// Helper function to calculate string similarity (improved for menu item matching)
function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  // Exact match gets highest score
  if (s1 === s2) return 1.0;

  // Check if one contains the other (this is the most important for menu items)
  if (s1.includes(s2)) {
    // Search term is contained in target string (e.g., "juha" in "Pileća juha")
    return Math.min(0.9, 0.5 + (s2.length / s1.length) * 0.4);
  }

  if (s2.includes(s1)) {
    // Target string contains search term (e.g., "Pizza carbonara" contains "pizza")
    return Math.min(0.9, 0.5 + (s1.length / s2.length) * 0.4);
  }

  // Check word boundaries (split by spaces and check if any word matches)
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);

  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1 === word2 && word1.length > 2) {
        // Only consider words longer than 2 chars
        return 0.8; // Good word match
      }
      if (word1.includes(word2) || word2.includes(word1)) {
        const longer = Math.max(word1.length, word2.length);
        const shorter = Math.min(word1.length, word2.length);
        if (shorter >= 3) {
          // Only consider words longer than 3 chars
          return 0.6 + (shorter / longer) * 0.2;
        }
      }
    }
  }

  // Calculate character-based similarity as fallback
  const set1 = new Set(s1.split(''));
  const set2 = new Set(s2.split(''));
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

// Helper function to check if search term matches with threshold
function matchesWithThreshold(searchTerm, targetString, threshold = 0.3) {
  // Lowered threshold to 0.3
  const similarity = calculateSimilarity(searchTerm, targetString);
  console.log(
    `Similarity calculation: "${searchTerm}" vs "${targetString}" = ${similarity} (threshold: ${threshold})`,
  );
  return similarity >= threshold;
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

    // Determine search mode based on presence of commas
    const isMenuSearch = searchTerms.length > 1; // Multiple terms separated by commas
    const isSingleTermSearch = searchTerms.length === 1; // Single term - could be restaurant name or food

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
        let restaurantMatches = new Map();
        let finalRestaurants = [];

        if (isMenuSearch) {
          // PRIORITY 1: Search in menu items first (when multiple terms with commas)
          console.log('Menu search mode - searching for food items');
          console.log('Search terms:', searchTerms);

          const menuItems = await MenuItemTranslation.findAll({
            where: {
              [Op.or]: searchTerms.map((term) => ({
                name: { [Op.iLike]: `%${term}%` },
              })),
            },
            include: [{ model: MenuItem, as: 'menuItem' }],
          });

          const drinkItems = await DrinkItemTranslation.findAll({
            where: {
              [Op.or]: searchTerms.map((term) => ({
                name: { [Op.iLike]: `%${term}%` },
              })),
            },
            include: [{ model: DrinkItem, as: 'drinkItem' }],
          });

          console.log('Found menu items:', menuItems.length);
          console.log('Found drink items:', drinkItems.length);
          console.log(
            'Sample menu items:',
            menuItems.slice(0, 3).map((item) => ({
              name: item.name,
              restaurantId: item.menuItem.restaurantId,
            })),
          );
          console.log(
            'Sample drink items:',
            drinkItems.slice(0, 3).map((item) => ({
              name: item.name,
              restaurantId: item.drinkItem.restaurantId,
            })),
          );

          // Get restaurant IDs from menu and drink items
          const menuRestaurantIds = menuItems.map(
            (item) => item.menuItem.restaurantId,
          );
          const drinkRestaurantIds = drinkItems.map(
            (item) => item.drinkItem.restaurantId,
          );

          // Combine all restaurant IDs
          const allRestaurantIds = [
            ...new Set([...menuRestaurantIds, ...drinkRestaurantIds]),
          ];

          console.log('Restaurant IDs with menu items:', allRestaurantIds);

          if (allRestaurantIds.length > 0) {
            // Get restaurants that have menu items
            const menuRestaurants = await Restaurant.findAll({
              ...restaurantQuery,
              where: {
                ...restaurantQuery.where,
                id: { [Op.in]: allRestaurantIds },
              },
            });

            console.log(
              'Found restaurants with menu items:',
              menuRestaurants.length,
            );

            // Calculate match scores for menu items
            menuRestaurants.forEach((restaurant) => {
              const menuMatches = menuItems.filter(
                (item) => item.menuItem.restaurantId === restaurant.id,
              );
              const drinkMatches = drinkItems.filter(
                (item) => item.drinkItem.restaurantId === restaurant.id,
              );

              console.log(`Restaurant ${restaurant.name}:`, {
                menuMatches: menuMatches.length,
                drinkMatches: drinkMatches.length,
                menuItems: menuMatches.map((item) => item.name),
                drinkItems: drinkMatches.map((item) => item.name),
              });

              const matchedTerms = new Set();
              const matchDetails = [];
              let totalAccuracy = 0;

              // Check menu item matches
              menuMatches.forEach((item) => {
                console.log(
                  `Checking menu item "${item.name}" against search terms:`,
                  searchTerms,
                );
                const matchedTerm = searchTerms.find((term) => {
                  const matches = matchesWithThreshold(term, item.name, 0.6);
                  console.log(
                    `Term "${term}" vs item "${item.name}": matches = ${matches}`,
                  );
                  return matches;
                });
                if (matchedTerm) {
                  const accuracy = calculateSimilarity(matchedTerm, item.name);
                  console.log(
                    `Found match: "${matchedTerm}" in "${item.name}" with accuracy ${accuracy}`,
                  );
                  matchedTerms.add(matchedTerm);
                  matchDetails.push({
                    type: 'menu',
                    term: matchedTerm,
                    itemName: item.name,
                    accuracy,
                  });
                  totalAccuracy += accuracy;
                }
              });

              // Check drink item matches
              drinkMatches.forEach((item) => {
                console.log(
                  `Checking drink item "${item.name}" against search terms:`,
                  searchTerms,
                );
                const matchedTerm = searchTerms.find((term) => {
                  const matches = matchesWithThreshold(term, item.name, 0.6);
                  console.log(
                    `Term "${term}" vs item "${item.name}": matches = ${matches}`,
                  );
                  return matches;
                });
                if (matchedTerm) {
                  const accuracy = calculateSimilarity(matchedTerm, item.name);
                  console.log(
                    `Found match: "${matchedTerm}" in "${item.name}" with accuracy ${accuracy}`,
                  );
                  matchedTerms.add(matchedTerm);
                  matchDetails.push({
                    type: 'drink',
                    term: matchedTerm,
                    itemName: item.name,
                    accuracy,
                  });
                  totalAccuracy += accuracy;
                }
              });

              console.log(`Restaurant ${restaurant.name} final results:`, {
                matchedTerms: Array.from(matchedTerms),
                matchDetails: matchDetails.length,
                totalAccuracy,
              });

              const matchCount = matchedTerms.size;
              const accuracy =
                matchDetails.length > 0
                  ? totalAccuracy / matchDetails.length
                  : 0;

              restaurantMatches.set(restaurant.id, {
                matchCount,
                matchedTerms: Array.from(matchedTerms),
                matchDetails,
                matchReason: 'menu_items',
                priority: 1, // Highest priority for menu matches
                accuracy,
              });
            });

            finalRestaurants = menuRestaurants;
          }

          // PRIORITY 2: If we don't have enough menu matches, search by restaurant names
          if (finalRestaurants.length < 10) {
            // Arbitrary threshold
            console.log('Adding restaurant name matches as fallback');

            const nameRestaurants = await Restaurant.findAll({
              ...restaurantQuery,
              where: {
                ...restaurantQuery.where,
                [Op.or]: searchTerms.map((term) => ({
                  name: { [Op.iLike]: `%${term}%` },
                })),
              },
            });

            nameRestaurants.forEach((restaurant) => {
              if (!restaurantMatches.has(restaurant.id)) {
                const matchedTerms = searchTerms.filter((term) =>
                  matchesWithThreshold(term, restaurant.name, 0.6),
                );

                if (matchedTerms.length > 0) {
                  const accuracy = calculateSimilarity(
                    matchedTerms[0],
                    restaurant.name,
                  );

                  restaurantMatches.set(restaurant.id, {
                    matchCount: matchedTerms.length,
                    matchedTerms,
                    matchDetails: [
                      {
                        type: 'name',
                        term: matchedTerms[0],
                        itemName: restaurant.name,
                        accuracy,
                      },
                    ],
                    matchReason: 'restaurant_name',
                    priority: 2, // Lower priority for name matches
                    accuracy,
                  });

                  finalRestaurants.push(restaurant);
                }
              }
            });
          }
        } else {
          // Single term search - check both restaurant names and menu items with accuracy
          console.log(
            'Single term search - checking both restaurant names and menu items with accuracy',
          );

          const searchTerm = searchTerms[0];

          // Search in restaurant names with threshold
          const nameRestaurants = await Restaurant.findAll({
            ...restaurantQuery,
            where: {
              ...restaurantQuery.where,
              name: { [Op.iLike]: `%${searchTerm}%` },
            },
          });

          // Search in menu items
          const menuItems = await MenuItemTranslation.findAll({
            where: {
              name: { [Op.iLike]: `%${searchTerm}%` },
            },
            include: [{ model: MenuItem, as: 'menuItem' }],
          });

          const drinkItems = await DrinkItemTranslation.findAll({
            where: {
              name: { [Op.iLike]: `%${searchTerm}%` },
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

          const allRestaurantIds = [
            ...new Set([...menuRestaurantIds, ...drinkRestaurantIds]),
          ];

          // Combine all restaurants
          const allRestaurants = [...nameRestaurants];

          if (allRestaurantIds.length > 0) {
            const menuRestaurants = await Restaurant.findAll({
              ...restaurantQuery,
              where: {
                ...restaurantQuery.where,
                id: { [Op.in]: allRestaurantIds },
              },
            });

            // Add menu restaurants that aren't already in name results
            menuRestaurants.forEach((restaurant) => {
              if (!allRestaurants.find((r) => r.id === restaurant.id)) {
                allRestaurants.push(restaurant);
              }
            });
          }

          // Calculate match scores with accuracy
          allRestaurants.forEach((restaurant) => {
            const isNameMatch = nameRestaurants.some(
              (r) => r.id === restaurant.id,
            );
            const isMenuMatch = allRestaurantIds.includes(restaurant.id);

            if (isNameMatch && isMenuMatch) {
              // Restaurant matches both name and menu - calculate accuracy for both
              const nameAccuracy = calculateSimilarity(
                searchTerm,
                restaurant.name,
              );
              const menuAccuracy = calculateSimilarity(searchTerm, 'menu_item'); // Default menu accuracy

              restaurantMatches.set(restaurant.id, {
                matchCount: 1,
                matchedTerms: [searchTerm],
                matchDetails: [
                  {
                    type: 'both',
                    term: searchTerm,
                    itemName: restaurant.name,
                    accuracy: Math.max(nameAccuracy, menuAccuracy),
                  },
                ],
                matchReason: 'both_name_and_menu',
                priority: 1,
                accuracy: Math.max(nameAccuracy, menuAccuracy),
              });
            } else if (isMenuMatch) {
              // Menu match only - find the best matching menu item
              const menuMatches = menuItems.filter(
                (item) => item.menuItem.restaurantId === restaurant.id,
              );
              const drinkMatches = drinkItems.filter(
                (item) => item.drinkItem.restaurantId === restaurant.id,
              );

              let bestAccuracy = 0;
              let bestItemName = '';

              [...menuMatches, ...drinkMatches].forEach((item) => {
                const accuracy = calculateSimilarity(searchTerm, item.name);
                if (accuracy > bestAccuracy) {
                  bestAccuracy = accuracy;
                  bestItemName = item.name;
                }
              });

              restaurantMatches.set(restaurant.id, {
                matchCount: 1,
                matchedTerms: [searchTerm],
                matchDetails: [
                  {
                    type: 'menu',
                    term: searchTerm,
                    itemName: bestItemName,
                    accuracy: bestAccuracy,
                  },
                ],
                matchReason: 'menu_item',
                priority: 2,
                accuracy: bestAccuracy,
              });
            } else {
              // Name match only
              const nameAccuracy = calculateSimilarity(
                searchTerm,
                restaurant.name,
              );

              restaurantMatches.set(restaurant.id, {
                matchCount: 1,
                matchedTerms: [searchTerm],
                matchDetails: [
                  {
                    type: 'name',
                    term: searchTerm,
                    itemName: restaurant.name,
                    accuracy: nameAccuracy,
                  },
                ],
                matchReason: 'restaurant_name',
                priority: 3,
                accuracy: nameAccuracy,
              });
            }
          });

          finalRestaurants = allRestaurants;
        }

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
            matchReason: 'unknown',
            priority: 999,
            accuracy: 0,
          };

          // Calculate isPopular based on AnalyticsEvent data
          const viewCount = viewCountMap.get(restaurant.id) || 0;
          const isPopular = viewCount >= 5; // Restoran je popularan ako je imao 5+ unique posjeta u zadnjih 7 dana

          const isNew =
            restaurant.isClaimed &&
            restaurant.createdAt >=
              new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

          // Generate match reason label
          let matchReasonLabel = '';
          let matchReasonType = '';

          if (isMenuSearch) {
            if (matches.matchReason === 'menu_items') {
              matchReasonLabel = `${matches.matchCount}/${searchTerms.length} tražena proizvoda`;
              matchReasonType = 'menu_match';
            } else if (matches.matchReason === 'restaurant_name') {
              matchReasonLabel = 'Ime restorana';
              matchReasonType = 'name_match';
            }
          } else {
            if (matches.matchReason === 'both_name_and_menu') {
              matchReasonLabel = 'Ime + proizvod';
              matchReasonType = 'both_match';
            } else if (matches.matchReason === 'menu_item') {
              matchReasonLabel = 'Proizvod u meniju';
              matchReasonType = 'menu_match';
            } else if (matches.matchReason === 'restaurant_name') {
              matchReasonLabel = 'Ime restorana';
              matchReasonType = 'name_match';
            }
          }

          return {
            ...restaurant.toJSON(),
            distance,
            matchScore: matches.matchCount / searchTerms.length,
            matchedTerms: matches.matchedTerms,
            totalSearchTerms: searchTerms.length,
            isPopular,
            isNew,
            isFavorite: userFavorites.has(restaurant.id),
            matchReason: matchReasonLabel,
            matchReasonType,
            matchPriority: matches.priority,
            matchAccuracy: matches.accuracy || 0, // Ensure accuracy is never null
          };
        });

        // Sort results based on priority, accuracy, and sortBy parameter
        restaurantsWithMetrics.sort((a, b) => {
          if (isMenuSearch) {
            // For menu search: ALWAYS prioritize by match count first, then by priority
            if (a.matchCount !== b.matchCount) {
              return b.matchCount - a.matchCount; // Higher match count first
            }

            // If match count is same, then by priority
            if (a.matchPriority !== b.matchPriority) {
              return a.matchPriority - b.matchPriority;
            }

            // If priority is same, then by accuracy
            if (Math.abs(a.matchAccuracy - b.matchAccuracy) > 0.1) {
              return b.matchAccuracy - a.matchAccuracy;
            }
          } else {
            // For single term search: prioritize by priority, then by accuracy
            if (a.matchPriority !== b.matchPriority) {
              return a.matchPriority - b.matchPriority;
            }

            // Then sort by accuracy (higher accuracy first)
            if (Math.abs(a.matchAccuracy - b.matchAccuracy) > 0.1) {
              return b.matchAccuracy - a.matchAccuracy;
            }
          }

          // Then sort by the specified sortBy parameter
          switch (sortBy) {
            case 'rating':
              return b.rating - a.rating;
            case 'distance':
              return a.distance - b.distance;
            case 'distance_rating':
              const scoreA = (a.rating * 5) / (a.distance + 1);
              const scoreB = (b.rating * 5) / (b.distance + 1);
              return scoreB - scoreA;
            case 'match_score':
              return b.matchScore - a.matchScore;
            default:
              return a.distance - b.distance;
          }
        });

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
                      matchReason: restaurant.matchReason,
                      matchReasonType: restaurant.matchReasonType,
                      matchAccuracy: restaurant.matchAccuracy,
                    }
                  : {
                      id: restaurant.id,
                      name: restaurant.name,
                      isPopular: restaurant.isPopular,
                      isNew: restaurant.isNew,
                      isClaimed: restaurant.isClaimed,
                      isFavorite: restaurant.isFavorite,
                      matchReason: restaurant.matchReason,
                      matchReasonType: restaurant.matchReasonType,
                      matchAccuracy: restaurant.matchAccuracy,
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
              searchMode: isMenuSearch ? 'menu_search' : 'single_term_search',
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
          searchInfo: {
            searchMode: isMenuSearch ? 'menu_search' : 'single_term_search',
            totalTerms: searchTerms.length,
            searchTerms,
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
