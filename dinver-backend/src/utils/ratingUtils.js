const { Review, Restaurant } = require('../../models');

/**
 * Calculates and updates the average rating for a restaurant
 * @param {string} restaurantId - The ID of the restaurant
 */
const calculateAverageRating = async (restaurantId) => {
  try {
    const reviews = await Review.findAll({
      where: {
        restaurantId: restaurantId,
        isHidden: false,
      },
      attributes: [
        'rating',
        'foodQuality',
        'service',
        'atmosphere',
        'valueForMoney',
      ],
    });

    if (reviews.length === 0) {
      await Restaurant.update(
        {
          rating: 0,
          foodQuality: 0,
          service: 0,
          atmosphere: 0,
          valueForMoney: 0,
          userRatingsTotal: 0,
        },
        { where: { id: restaurantId } },
      );
      return;
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const totalFoodQuality = reviews.reduce(
      (sum, review) => sum + review.foodQuality,
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
      (sum, review) => sum + review.valueForMoney,
      0,
    );

    await Restaurant.update(
      {
        rating: totalRating / reviews.length,
        foodQuality: totalFoodQuality / reviews.length,
        service: totalService / reviews.length,
        atmosphere: totalAtmosphere / reviews.length,
        valueForMoney: totalValueForMoney / reviews.length,
        userRatingsTotal: reviews.length,
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
