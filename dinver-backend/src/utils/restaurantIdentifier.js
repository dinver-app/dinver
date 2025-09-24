/**
 * Utility functions for handling restaurant identifiers (UUID or slug)
 */

/**
 * Check if a string is a valid UUID
 * UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 * @param {string} str - String to check
 * @returns {boolean} - True if string is a valid UUID
 */
const isUUID = (str) => {
  if (!str || typeof str !== 'string') return false;

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

/**
 * Get restaurant query condition based on identifier type
 * @param {string} identifier - Restaurant ID (UUID) or slug
 * @returns {object} - Sequelize where condition
 */
const getRestaurantQueryCondition = (identifier) => {
  if (isUUID(identifier)) {
    return { id: identifier };
  } else {
    return { slug: identifier };
  }
};

/**
 * Get restaurant ID from identifier (UUID or slug)
 * If it's already a UUID, return it. If it's a slug, we need to find the restaurant first.
 * @param {string} identifier - Restaurant ID (UUID) or slug
 * @param {object} Restaurant - Sequelize Restaurant model
 * @returns {Promise<string>} - Restaurant ID (UUID)
 */
const getRestaurantId = async (identifier, Restaurant) => {
  if (isUUID(identifier)) {
    return identifier;
  } else {
    // It's a slug, find the restaurant and return its ID
    const restaurant = await Restaurant.findOne({
      where: { slug: identifier },
      attributes: ['id'],
    });

    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    return restaurant.id;
  }
};

module.exports = {
  isUUID,
  getRestaurantQueryCondition,
  getRestaurantId,
};
