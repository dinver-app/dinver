const {
  getRestaurantQueryCondition,
  getRestaurantId,
} = require('../utils/restaurantIdentifier');
const { Restaurant } = require('../../models');

/**
 * Middleware that converts restaurantId parameter to appropriate query condition
 * Supports both UUID and slug identifiers
 */
const restaurantIdentifierMiddleware = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;

    if (!restaurantId) {
      return res
        .status(400)
        .json({ error: 'Restaurant identifier is required' });
    }

    // Get the appropriate query condition
    const queryCondition = getRestaurantQueryCondition(restaurantId);

    // Add the query condition to the request object
    req.restaurantQuery = queryCondition;

    // Also add the restaurant ID (UUID) for cases where we need the actual ID
    req.restaurantId = await getRestaurantId(restaurantId, Restaurant);

    next();
  } catch (error) {
    console.error('Error in restaurantIdentifierMiddleware:', error);
    return res.status(404).json({ error: 'Restaurant not found' });
  }
};

module.exports = {
  restaurantIdentifierMiddleware,
};
