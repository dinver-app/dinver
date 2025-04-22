const { Review, Restaurant, User, UserPointsHistory } = require('../../models');
const { handleError } = require('../../utils/errorHandler');
const { ValidationError, Op } = require('sequelize');
const { uploadToS3 } = require('../../utils/s3Upload');
const { calculateAverageRating } = require('../utils/ratingUtils');
const PointsService = require('../../utils/pointsService');

const EDIT_WINDOW_DAYS = 7;
const MAX_EDITS = 1;
const REVIEW_COOLDOWN_MONTHS = 6;

const createReview = async (req, res) => {
  try {
    const {
      restaurantId,
      rating,
      food_quality,
      service,
      atmosphere,
      value_for_money,
      text,
      photos,
    } = req.body;
    const userId = req.user.id;

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
        user_id: userId,
        restaurant_id: restaurantId,
        is_hidden: false,
        created_at: {
          [Op.gte]: sixMonthsAgo,
        },
      },
    });

    if (existingReview) {
      return res.status(400).json({
        error: `You can review this restaurant again after ${REVIEW_COOLDOWN_MONTHS} months from your last review`,
      });
    }

    // Check if user already reviewed this restaurant
    const existingReviewAgain = await Review.findOne({
      where: {
        user_id: userId,
        restaurant_id: restaurantId,
        is_hidden: false,
      },
    });

    if (existingReviewAgain) {
      return res
        .status(400)
        .json({ error: 'You have already reviewed this restaurant' });
    }

    // Create the review
    const review = await Review.create({
      user_id: userId,
      restaurant_id: restaurantId,
      rating,
      food_quality,
      service,
      atmosphere,
      value_for_money,
      text,
      photos: [],
    });

    // Award points through PointsService
    await PointsService.addReviewPoints(
      userId,
      review.id,
      text,
      photos && photos.length > 0,
      restaurantId,
    );

    // Handle photo uploads
    if (photos && photos.length > 0) {
      const uploadedPhotos = [];
      for (const photo of photos) {
        const uploadResult = await uploadToS3(photo);
        uploadedPhotos.push(uploadResult.Location);
      }

      await review.update({ photos: uploadedPhotos });
    }

    // Update restaurant's average rating
    await calculateAverageRating(restaurantId);

    // Return the created review with user details
    const reviewWithDetails = await Review.findByPk(review.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name'],
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
        user_id: userId,
        is_hidden: false,
      },
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name'],
        },
      ],
      order: [['created_at', 'DESC']],
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
    const userId = req.user?.id; // Optional: logged in user

    const reviews = await Review.findAll({
      where: {
        restaurant_id: restaurantId,
        is_hidden: false,
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    // Add virtual fields to each review
    const reviewsWithMeta = reviews.map((review) => ({
      ...review.toJSON(),
      is_edited: review.last_edited_at !== null,
      can_edit: userId === review.user_id ? review.can_edit : false,
    }));

    res.json(reviewsWithMeta);
  } catch (error) {
    handleError(res, error);
  }
};

const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, text, photos } = req.body;
    const userId = req.user.id;

    const review = await Review.findOne({
      where: {
        id,
        user_id: userId,
        is_hidden: false,
      },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Check edit window
    const editWindowEnd = new Date(review.created_at);
    editWindowEnd.setDate(editWindowEnd.getDate() + EDIT_WINDOW_DAYS);

    if (new Date() > editWindowEnd) {
      return res.status(403).json({
        error: `Reviews can only be edited within ${EDIT_WINDOW_DAYS} days of creation`,
      });
    }

    // Check edit count
    if (review.edit_count >= MAX_EDITS) {
      return res.status(403).json({
        error: `Reviews can only be edited ${MAX_EDITS} time`,
      });
    }

    // Check if new photos are being added
    const existingPhotos = review.photos || [];
    const newPhotos = photos
      ? photos.filter((photo) => !existingPhotos.includes(photo))
      : [];

    // Handle new photo uploads
    if (newPhotos.length > 0) {
      const uploadedPhotos = [];
      for (const photo of newPhotos) {
        const uploadResult = await uploadToS3(photo);
        uploadedPhotos.push(uploadResult.Location);
      }

      // Award points for adding new photos if none existed before
      if (existingPhotos.length === 0) {
        await PointsService.addReviewPoints(userId, review.id, null, true);
      }

      // Combine existing and new photos
      const updatedPhotos = [...existingPhotos, ...uploadedPhotos];
      await review.update({ photos: updatedPhotos });
    }

    // Update review content and rating
    await review.update({
      rating: rating || review.rating,
      text: text || review.text,
      last_edited_at: new Date(),
      edit_count: review.edit_count + 1,
    });

    // Update restaurant's average rating if rating changed
    if (rating !== review.rating) {
      await calculateAverageRating(review.restaurant_id);
    }

    // Return updated review with user details
    const updatedReview = await Review.findByPk(review.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name'],
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
        user_id: userId,
        is_hidden: false,
      },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Soft delete - hide the review instead of deleting it
    await review.update({ is_hidden: true });

    // Update restaurant's average rating
    await calculateAverageRating(review.restaurant_id);

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

  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const totalFoodQuality = reviews.reduce(
    (sum, review) => sum + review.food_quality,
    0,
  );
  const totalService = reviews.reduce((sum, review) => sum + review.service, 0);
  const totalAtmosphere = reviews.reduce(
    (sum, review) => sum + review.atmosphere,
    0,
  );
  const totalValueForMoney = reviews.reduce(
    (sum, review) => sum + review.value_for_money,
    0,
  );

  const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;
  const averageFoodQuality =
    reviews.length > 0 ? totalFoodQuality / reviews.length : 0;
  const averageService = reviews.length > 0 ? totalService / reviews.length : 0;
  const averageAtmosphere =
    reviews.length > 0 ? totalAtmosphere / reviews.length : 0;
  const averageValueForMoney =
    reviews.length > 0 ? totalValueForMoney / reviews.length : 0;

  await Restaurant.update(
    {
      rating: averageRating,
      food_quality: averageFoodQuality,
      service: averageService,
      atmosphere: averageAtmosphere,
      value_for_money: averageValueForMoney,
      user_ratings_total: reviews.length,
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
