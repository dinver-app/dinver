const { Review, Restaurant } = require('../models');

/**
 * Calculates and updates the average rating for a restaurant
 * @param {string} restaurantId - The ID of the restaurant
 */
const calculateAverageRating = async (restaurantId) => {
  try {
    // Get all non-hidden reviews for the restaurant
    const reviews = await Review.findAll({
      where: {
        restaurantId,
        isHidden: false,
      },
      attributes: ['rating'],
    });

    if (reviews.length === 0) {
      // If no reviews, set rating to 0
      await Restaurant.update({ rating: 0 }, { where: { id: restaurantId } });
      return;
    }

    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    // Update restaurant's rating
    await Restaurant.update(
      { rating: averageRating },
      { where: { id: restaurantId } },
    );
  } catch (error) {
    console.error('Error calculating average rating:', error);
    throw error;
  }
};

module.exports = {
  calculateAverageRating,
};
