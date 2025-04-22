const { Review, Restaurant } = require('../../models');

/**
 * Calculates and updates the average rating for a restaurant
 * @param {string} restaurantId - The ID of the restaurant
 */
const calculateAverageRating = async (restaurantId) => {
  try {
    const reviews = await Review.findAll({
      where: {
        restaurant_id: restaurantId,
        is_hidden: false,
      },
      attributes: [
        'rating',
        'food_quality',
        'service',
        'atmosphere',
        'value_for_money',
      ],
    });

    if (reviews.length === 0) {
      await Restaurant.update(
        {
          rating: 0,
          food_quality: 0,
          service: 0,
          atmosphere: 0,
          value_for_money: 0,
          user_ratings_total: 0,
        },
        { where: { id: restaurantId } },
      );
      return;
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const totalFoodQuality = reviews.reduce(
      (sum, review) => sum + review.food_quality,
      0,
    );
    const totalService = reviews.reduce(
      (sum, review) => sum + review.service,
      0,
    );
    const totalAtmosphere = reviews.reduce(
      (sum, review) => sum + review.atmosphere,
      0,
    );
    const totalValueForMoney = reviews.reduce(
      (sum, review) => sum + review.value_for_money,
      0,
    );

    await Restaurant.update(
      {
        rating: totalRating / reviews.length,
        food_quality: totalFoodQuality / reviews.length,
        service: totalService / reviews.length,
        atmosphere: totalAtmosphere / reviews.length,
        value_for_money: totalValueForMoney / reviews.length,
        user_ratings_total: reviews.length,
      },
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
