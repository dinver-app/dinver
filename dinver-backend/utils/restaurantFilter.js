/**
 * Restaurant filtering utilities for test restaurants
 * Test restaurants are only visible to whitelisted users
 */

const WHITELISTED_TEST_EMAILS = [
  'ivankikic49@gmail.com',
  'mbaivic23@student.foi.hr',
  'johndoe@gmail.com'
];

/**
 * Check if user should see test restaurants
 * @param {string} userEmail - Email of the authenticated user
 * @returns {boolean} - True if user can see test restaurants
 */
function shouldIncludeTestRestaurants(userEmail) {
  if (!userEmail) return false;
  return WHITELISTED_TEST_EMAILS.includes(userEmail.toLowerCase());
}

/**
 * Get restaurant filter for database queries
 * @param {string} userEmail - Email of the authenticated user
 * @returns {object} - Sequelize where clause to filter test restaurants
 */
function getRestaurantFilter(userEmail) {
  if (shouldIncludeTestRestaurants(userEmail)) {
    return {}; // Return all restaurants (including test)
  }
  return { isTest: false }; // Filter out test restaurants
}

/**
 * Add test restaurant filter to existing where clause
 * @param {object} whereClause - Existing Sequelize where clause
 * @param {string} userEmail - Email of the authenticated user
 * @returns {object} - Combined where clause with test filter
 */
function addTestFilter(whereClause = {}, userEmail) {
  const testFilter = getRestaurantFilter(userEmail);
  return {
    ...whereClause,
    ...testFilter,
  };
}

module.exports = {
  WHITELISTED_TEST_EMAILS,
  shouldIncludeTestRestaurants,
  getRestaurantFilter,
  addTestFilter,
};
