const { Review, Restaurant, User } = require('../../models');
const { uploadToS3 } = require('../../utils/s3Upload');
const { Op } = require('sequelize');

async function createReview(req, res) {
  try {
    const { restaurantId } = req.params;
    const { rating, comment } = req.body;
    const files = req.files;

    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    let imageUrls = [];
    if (files && files.length > 0) {
      const folder = `review_images/${restaurantId}`;
      imageUrls = await Promise.all(
        files.map((file) => uploadToS3(file, folder)),
      );
    }

    const review = await Review.create({
      user_id: req.user.id,
      restaurant_id: restaurantId,
      rating,
      comment,
      images: imageUrls,
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const sortOption = req.query.sort || 'date_desc';

    let order;
    switch (sortOption) {
      case 'date_asc':
        order = [['createdAt', 'ASC']];
        break;
      case 'rating_desc':
        order = [['rating', 'DESC']];
        break;
      case 'rating_asc':
        order = [['rating', 'ASC']];
        break;
      case 'date_desc':
      default:
        order = [['createdAt', 'DESC']];
        break;
    }

    const users = await User.findAll({
      attributes: ['id', 'firstName', 'lastName', 'email'],
    });
    const userMap = users.reduce((map, user) => {
      map[user.id] = user;
      return map;
    }, {});

    const { count, rows: reviews } = await Review.findAndCountAll({
      where: {
        restaurant_id: restaurantId,
        [Op.or]: [
          { comment: { [Op.iLike]: `%${search}%` } },
          { comment: null },
          { rating: parseFloat(search) || 0 },
        ],
      },
      limit,
      offset,
      order,
    });

    const reviewsWithUserDetails = reviews.map((review) => {
      const user = userMap[review.user_id] || {};
      return {
        ...review.toJSON(),
        userFirstName: user.firstName || 'Unknown',
        userLastName: user.lastName || 'Unknown',
        userEmail: user.email || 'Unknown',
      };
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      totalReviews: count,
      totalPages,
      currentPage: page,
      reviews: reviewsWithUserDetails,
    });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching reviews' });
  }
}

module.exports = {
  createReview,
  getReviews,
};
