const { Review, Restaurant, User, UserPointsHistory } = require('../../models');
const { handleError } = require('../../utils/errorHandler');
const { ValidationError, Op } = require('sequelize');
const { uploadToS3 } = require('../../utils/s3Upload');
const { calculateAverageRating } = require('../utils/ratingUtils');
const PointsService = require('../../utils/pointsService');
const { getMediaUrl } = require('../../config/cdn');

const EDIT_WINDOW_DAYS = 7;
const MAX_EDITS = 1;
const REVIEW_COOLDOWN_MONTHS = 6;

const createReview = async (req, res) => {
  try {
    const {
      restaurantId,
      rating,
      foodQuality,
      service,
      atmosphere,
      visitDate,
      text,
    } = req.body;
    const files = req.files;
    const userId = req.user.id;

    // Check if user is banned
    const user = await User.findByPk(userId);
    if (user.banned) {
      return res.status(403).json({
        error: 'Your account has been banned. You cannot create new reviews.',
      });
    }

    // Validate if restaurant exists
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Check if user has reviewed this restaurant in the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - REVIEW_COOLDOWN_MONTHS);

    const existingReview = await Review.findOne({
      where: {
        userId: userId,
        restaurantId: restaurantId,
        isHidden: false,
        createdAt: {
          [Op.gte]: sixMonthsAgo,
        },
      },
    });

    if (existingReview) {
      return res.status(400).json({
        error: `You can review this restaurant again after ${REVIEW_COOLDOWN_MONTHS} months from your last review`,
      });
    }

    // Create the review
    const review = await Review.create({
      userId: userId,
      restaurantId: restaurantId,
      rating,
      foodQuality,
      service,
      atmosphere,
      visitDate: visitDate || new Date(),
      text,
      photos: [],
    });

    // Award points through PointsService
    // await PointsService.addReviewPoints(
    //   userId,
    //   review.id,
    //   text,
    //   files && files.length > 0,
    //   restaurantId,
    // );

    // Handle photo uploads
    if (files && files.length > 0) {
      const folder = `review_images/${review.id}`;
      const imageKeys = await Promise.all(
        files.map((file) => uploadToS3(file, folder)),
      );

      // Generate CloudFront URLs for images
      const imageUrls = imageKeys.map((key) => ({
        key,
        url: getMediaUrl(key, 'image'),
      }));

      await review.update({ photos: imageUrls });
    }

    // Update restaurant's average rating
    await calculateAverageRating(restaurantId);

    // Return the created review with user details
    const reviewWithDetails = await Review.findByPk(review.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
    });

    res.status(201).json(reviewWithDetails);
  } catch (error) {
    console.error('Error creating review:', error);
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create review' });
  }
};

const getUserReviews = async (req, res) => {
  try {
    const userId = req.user.id;

    const reviews = await Review.findAll({
      where: {
        userId: userId,
        isHidden: false,
      },
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json(reviews);
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

const getRestaurantReviews = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const userId = req.user?.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
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

    const { count, rows: reviews } = await Review.findAndCountAll({
      where: {
        restaurantId: restaurantId,
        isHidden: false,
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName'],
        },
      ],
      order,
      limit,
      offset,
    });

    // Add virtual fields to each review
    const reviewsWithMeta = reviews.map((review) => ({
      ...review.toJSON(),
      isEdited: review.lastEditedAt !== null,
      canEdit: userId === review.userId ? review.canEdit : false,
    }));

    const totalPages = Math.ceil(count / limit);

    res.json({
      totalReviews: count,
      totalPages,
      currentPage: page,
      reviews: reviewsWithMeta,
    });
  } catch (error) {
    handleError(res, error);
  }
};

const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, foodQuality, service, atmosphere, text } = req.body;
    const files = req.files;
    const userId = req.user.id;

    // Check if user is banned
    const user = await User.findByPk(userId);
    if (user.banned) {
      return res.status(403).json({
        error: 'Your account has been banned. You cannot update reviews.',
      });
    }

    const review = await Review.findOne({
      where: {
        id,
        userId: userId,
        isHidden: false,
      },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Check edit window
    const editWindowEnd = new Date(review.createdAt);
    editWindowEnd.setDate(editWindowEnd.getDate() + EDIT_WINDOW_DAYS);

    if (new Date() > editWindowEnd) {
      return res.status(403).json({
        error: `Reviews can only be edited within ${EDIT_WINDOW_DAYS} days of creation`,
      });
    }

    // Check edit count
    if (review.editCount >= MAX_EDITS) {
      return res.status(403).json({
        error: `Reviews can only be edited ${MAX_EDITS} time`,
      });
    }

    // Handle new photo uploads
    if (files && files.length > 0) {
      const folder = `review_images/${review.id}`;
      const imageKeys = await Promise.all(
        files.map((file) => uploadToS3(file, folder)),
      );

      // Generate CloudFront URLs for images
      const newImageUrls = imageKeys.map((key) => ({
        key,
        url: getMediaUrl(key, 'image'),
      }));

      // Combine existing and new photos
      const existingPhotos = review.photos || [];
      const updatedPhotos = [
        ...existingPhotos.map((photo) =>
          typeof photo === 'string'
            ? { key: photo, url: getMediaUrl(photo, 'image') }
            : photo,
        ),
        ...newImageUrls,
      ];

      // Award points for adding new photos if none existed before
      // if (existingPhotos.length === 0) {
      //   await PointsService.addReviewPoints(userId, review.id, null, true);
      // }

      await review.update({ photos: updatedPhotos });
    }

    // Update review content and ratings
    await review.update({
      rating: rating || review.rating,
      foodQuality: foodQuality || review.foodQuality,
      service: service || review.service,
      atmosphere: atmosphere || review.atmosphere,
      text: text || review.text,
      lastEditedAt: new Date(),
      editCount: review.editCount + 1,
    });

    // Update restaurant's average rating if any rating changed
    if (
      rating !== review.rating ||
      foodQuality !== review.foodQuality ||
      service !== review.service ||
      atmosphere !== review.atmosphere
    ) {
      await calculateAverageRating(review.restaurantId);
    }

    // Return updated review with user details
    const updatedReview = await Review.findByPk(review.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
    });

    res.json(updatedReview);
  } catch (error) {
    console.error('Error updating review:', error);
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update review' });
  }
};

const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const review = await Review.findOne({
      where: {
        id,
        userId: userId,
        isHidden: false,
      },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Soft delete - hide the review instead of deleting it
    await review.update({ isHidden: true });

    // Update restaurant's average rating
    await calculateAverageRating(review.restaurantId);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
};

// Helper function to update restaurant's average rating
const updateRestaurantRating = async (restaurantId) => {
  const reviews = await Review.findAll({
    where: {
      restaurantId: restaurantId,
      isHidden: false,
    },
    attributes: ['rating', 'foodQuality', 'service', 'atmosphere'],
  });

  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const totalFoodQuality = reviews.reduce(
    (sum, review) => sum + review.foodQuality,
    0,
  );
  const totalService = reviews.reduce((sum, review) => sum + review.service, 0);
  const totalAtmosphere = reviews.reduce(
    (sum, review) => sum + review.atmosphere,
    0,
  );

  const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;
  const averageFoodQuality =
    reviews.length > 0 ? totalFoodQuality / reviews.length : 0;
  const averageService = reviews.length > 0 ? totalService / reviews.length : 0;
  const averageAtmosphere =
    reviews.length > 0 ? totalAtmosphere / reviews.length : 0;

  await Restaurant.update(
    {
      rating: averageRating,
      foodQuality: averageFoodQuality,
      service: averageService,
      atmosphere: averageAtmosphere,
      userRatingsTotal: reviews.length,
    },
    { where: { id: restaurantId } },
  );
};

module.exports = {
  createReview,
  getUserReviews,
  updateReview,
  deleteReview,
  getRestaurantReviews,
};
