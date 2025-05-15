const { Op } = require('sequelize');
const {
  MenuItem,
  DrinkItem,
  Restaurant,
  FoodType,
  MenuItemTranslation,
  DrinkItemTranslation,
} = require('../../models');

module.exports = {
  async globalSearch(req, res) {
    const { query, latitude, longitude } = req.query;
    const searchTerms = query.split(',').map((term) => term.trim());

    try {
      // Search for FoodTypes
      const foodTypes = await FoodType.findAll({
        where: {
          [Op.or]: [
            { nameEn: { [Op.iLike]: `%${searchTerms.join('%')}%` } },
            { nameHr: { [Op.iLike]: `%${searchTerms.join('%')}%` } },
          ],
        },
        limit: 3,
      });

      // Search for MenuItems
      const menuItems = await MenuItemTranslation.findAll({
        where: {
          [Op.or]: [{ name: { [Op.iLike]: `%${searchTerms.join('%')}%` } }],
        },
        include: [{ model: MenuItem, as: 'menuItem' }],
      });

      // Search for DrinkItems
      const drinkItems = await DrinkItemTranslation.findAll({
        where: {
          [Op.or]: [{ name: { [Op.iLike]: `%${searchTerms.join('%')}%` } }],
        },
        include: [{ model: DrinkItem, as: 'drinkItem' }],
      });

      // Extract restaurant IDs
      const restaurantIds = new Set([
        ...menuItems.map((item) => item.menuItem.restaurantId),
        ...drinkItems.map((item) => item.drinkItem.restaurantId),
      ]);

      // Search for Restaurants by name
      const restaurantNameMatches = await Restaurant.findAll({
        where: {
          name: { [Op.iLike]: `%${searchTerms.join('%')}%` },
        },
      });

      // Combine restaurant IDs from name matches and item matches
      restaurantNameMatches.forEach((restaurant) =>
        restaurantIds.add(restaurant.id),
      );

      // Find Restaurants with combined IDs
      const restaurants = await Restaurant.findAll({
        where: { id: { [Op.in]: Array.from(restaurantIds) } },
      });

      // Function to calculate distance between two coordinates
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

      // Calculate distance for all restaurants
      const restaurantsWithDistance = restaurants.map((restaurant) => {
        const distance = calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          restaurant.latitude,
          restaurant.longitude,
        );

        return {
          id: restaurant.id,
          name: restaurant.name,
          description: restaurant.description,
          address: restaurant.address,
          place: restaurant.place,
          latitude: restaurant.latitude,
          longitude: restaurant.longitude,
          rating: restaurant.rating,
          isClaimed: restaurant.isClaimed,
          userRatingsTotal: restaurant.userRatingsTotal,
          distance,
        };
      });

      // Sort by distance
      restaurantsWithDistance.sort((a, b) => a.distance - b.distance);

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
        foodTypes,
        restaurants: paginatedRestaurants,
        pagination: {
          currentPage: page,
          totalPages,
          totalRestaurants: restaurantsWithDistance.length,
        },
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'An error occurred during the search.' });
    }
  },
};
