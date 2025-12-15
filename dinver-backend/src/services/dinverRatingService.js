/**
 * Dinver Rating Service
 *
 * Calculates and updates restaurant ratings based on Experiences.
 *
 * Key principle: Each user counts as ONE rating, regardless of how many
 * times they visited the restaurant. Their rating is the average of all
 * their Experiences for that restaurant.
 *
 * This prevents spam - if Pero visits 10 times and rates 10.0 each time,
 * he still counts as just ONE rating of 10.0, not 10 ratings.
 */

const { Experience, Restaurant, sequelize } = require('../../models');
const { Op } = require('sequelize');

/**
 * Calculate and update the Dinver rating for a restaurant
 *
 * Algorithm:
 * 1. Get all APPROVED Experiences for the restaurant
 * 2. Group by userId
 * 3. For each user, calculate their average overallRating
 * 4. Calculate the average of all user averages
 * 5. Update restaurant.dinverRating and dinverReviewsCount
 *
 * @param {string} restaurantId - Restaurant UUID
 * @returns {Promise<{dinverRating: number|null, dinverReviewsCount: number}>}
 */
async function updateRestaurantDinverRating(restaurantId) {
  try {
    // Get all APPROVED Experiences for this restaurant with ratings
    const experiences = await Experience.findAll({
      where: {
        restaurantId,
        status: 'APPROVED',
        overallRating: { [Op.not]: null },
      },
      attributes: ['userId', 'overallRating'],
      raw: true,
    });

    if (experiences.length === 0) {
      // No experiences - reset rating
      await Restaurant.update(
        {
          dinverRating: null,
          dinverReviewsCount: 0,
        },
        { where: { id: restaurantId } }
      );

      return { dinverRating: null, dinverReviewsCount: 0 };
    }

    // Group by user and calculate each user's average
    const userRatings = new Map();

    for (const exp of experiences) {
      const userId = exp.userId;
      const rating = parseFloat(exp.overallRating);

      if (!userRatings.has(userId)) {
        userRatings.set(userId, { sum: 0, count: 0 });
      }

      const userData = userRatings.get(userId);
      userData.sum += rating;
      userData.count++;
    }

    // Calculate each user's average rating
    const userAverages = [];
    for (const [, userData] of userRatings) {
      const userAverage = userData.sum / userData.count;
      userAverages.push(userAverage);
    }

    // Calculate overall Dinver rating (average of user averages)
    const dinverRating = userAverages.reduce((a, b) => a + b, 0) / userAverages.length;
    const roundedRating = parseFloat(dinverRating.toFixed(1));
    const dinverReviewsCount = userAverages.length; // Number of unique users

    // Update restaurant
    await Restaurant.update(
      {
        dinverRating: roundedRating,
        dinverReviewsCount,
      },
      { where: { id: restaurantId } }
    );

    console.log(
      `[Dinver Rating] Updated restaurant ${restaurantId}: rating=${roundedRating}, reviewers=${dinverReviewsCount}`
    );

    return { dinverRating: roundedRating, dinverReviewsCount };
  } catch (error) {
    console.error(`[Dinver Rating] Error updating restaurant ${restaurantId}:`, error.message);
    throw error;
  }
}

/**
 * Recalculate Dinver ratings for all restaurants
 * Use this for bulk updates or data migrations
 *
 * @returns {Promise<{updated: number, errors: number}>}
 */
async function recalculateAllDinverRatings() {
  try {
    console.log('[Dinver Rating] Starting bulk recalculation...');

    // Get all restaurants that have at least one Experience
    const restaurantIds = await Experience.findAll({
      where: { status: 'APPROVED' },
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('restaurantId')), 'restaurantId']],
      raw: true,
    });

    let updated = 0;
    let errors = 0;

    for (const row of restaurantIds) {
      if (!row.restaurantId) continue;

      try {
        await updateRestaurantDinverRating(row.restaurantId);
        updated++;
      } catch {
        errors++;
      }
    }

    console.log(`[Dinver Rating] Bulk recalculation complete: ${updated} updated, ${errors} errors`);

    return { updated, errors };
  } catch (error) {
    console.error('[Dinver Rating] Bulk recalculation failed:', error.message);
    throw error;
  }
}

module.exports = {
  updateRestaurantDinverRating,
  recalculateAllDinverRatings,
};
