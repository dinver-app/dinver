const { Review, Restaurant } = require('../../models');

async function createReview(req, res) {
  try {
    const { restaurantId } = req.params;
    const { rating, comment, photo_reference } = req.body;

    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const review = await Review.create({
      user_id: req.user.id,
      restaurant_id: restaurantId,
      rating,
      comment,
      photo_reference,
    });
    res.status(201).json(review);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while creating the review' });
  }
}

async function getReviews(req, res) {
  try {
    const { restaurantId } = req.params;
    const reviews = await Review.findAll({
      where: { restaurant_id: restaurantId },
    });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching reviews' });
  }
}

module.exports = {
  createReview,
  getReviews,
};
