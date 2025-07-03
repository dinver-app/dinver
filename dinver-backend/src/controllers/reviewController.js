const {
  Review,
  Restaurant,
  User,
  UserAchievement,
  sequelize,
} = require('../../models');
const { handleError } = require('../../utils/errorHandler');
const { ValidationError, Op } = require('sequelize');
const { uploadToS3 } = require('../../utils/s3Upload');
const { calculateAverageRating } = require('../utils/ratingUtils');
const PointsService = require('../utils/pointsService');
const { getMediaUrl } = require('../../config/cdn');

const EDIT_WINDOW_DAYS = 7;
const MAX_EDITS = 1;
const REVIEW_COOLDOWN_MONTHS = 6;

// Helper function to check if user can review
const checkUserCanReview = async (userId, restaurantId) => {
  // Check if user is banned
  const user = await User.findByPk(userId);
  if (user.banned) {
    return {
      canReview: false,
      error: 'user_banned',
      metadata: { cooldownMonths: REVIEW_COOLDOWN_MONTHS },
    };
  }

  // Validate if restaurant exists
  const restaurant = await Restaurant.findByPk(restaurantId);
  if (!restaurant) {
    return {
      canReview: false,
      error: 'restaurant_not_found',
    };
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
    return {
      canReview: false,
      error: 'review_cooldown',
      metadata: { cooldownMonths: REVIEW_COOLDOWN_MONTHS },
    };
  }

  return { canReview: true };
};

// New endpoint to check if user can review
const canReview = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const userId = req.user.id;

    const result = await checkUserCanReview(userId, restaurantId);
    res.json(result);
  } catch (error) {
    console.error('Error checking review ability:', error);
    res.status(500).json({ error: 'server_error' });
  }
};

// Helper function to check if a review is high quality
const isHighQualityReview = (review, hasPhotos) => {
  return (
    review.text.length > 100 && // Long text
    hasPhotos // Has photos
  );
};

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

    // Check if user can review
    const canReviewCheck = await checkUserCanReview(userId, restaurantId);
    if (!canReviewCheck.canReview) {
      return res.status(403).json(canReviewCheck);
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

    // Check if review is long (more than 100 characters)
    const isLongReview = text && text.length > 100;

    // Award points through PointsService
    const pointsService = new PointsService(sequelize);
    await pointsService.addReviewPoints(
      userId,
      review.id,
      restaurantId,
      files && files.length > 0,
      isLongReview,
    );

    // Handle photo uploads
    if (files && files.length > 0) {
      const folder = `review_images/${review.id}`;
      const imageKeys = await Promise.all(
        files.map((file) => uploadToS3(file, folder)),
      );

      await review.update({ photos: imageKeys });

      // Check if this is a high-quality review and track achievement
      if (isHighQualityReview(review, true)) {
        await UserAchievement.trackProgress(
          userId,
          'ELITE_REVIEWER',
          review.id, // Use review ID as tag
        );
      }
    }

    // Update restaurant's average rating
    await calculateAverageRating(restaurantId);

    // Return the created review with user details and transformed image URLs
    const reviewWithDetails = await Review.findByPk(review.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
    });

    // Transform image keys to URLs for response
    const responseData = reviewWithDetails.toJSON();
    if (responseData.photos && Array.isArray(responseData.photos)) {
      responseData.photos = responseData.photos.map((photoKey) =>
        getMediaUrl(photoKey, 'image'),
      );
    }

    res.status(201).json(responseData);
  } catch (error) {
    console.error('Error creating review:', error);
    if (error instanceof ValidationError) {
      return res
        .status(400)
        .json({ error: 'validation_error', details: error.message });
    }
    res.status(500).json({ error: 'server_error' });
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

    // Transform photo URLs
    const transformedReviews = reviews.map((review) => {
      const reviewData = review.toJSON();
      if (reviewData.photos && Array.isArray(reviewData.photos)) {
        reviewData.photos = reviewData.photos.map((photoKey) =>
          getMediaUrl(photoKey, 'image'),
        );
      }
      return reviewData;
    });

    res.json(transformedReviews);
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

    // Add virtual fields to each review and transform photos
    const reviewsWithMeta = reviews.map((review) => {
      const reviewData = review.toJSON();
      // Transform photo keys to URLs
      if (reviewData.photos && Array.isArray(reviewData.photos)) {
        reviewData.photos = reviewData.photos.map((photoKey) =>
          getMediaUrl(photoKey, 'image'),
        );
      }
      return {
        ...reviewData,
        isEdited: review.lastEditedAt !== null,
        canEdit: userId === review.userId ? review.canEdit : false,
      };
    });

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

// Helper function to check if user can edit review
const checkUserCanEdit = async (userId, reviewId) => {
  // Check if user is banned
  const user = await User.findByPk(userId);
  if (user.banned) {
    return {
      canEdit: false,
      error: 'user_banned',
    };
  }

  // Find the review
  const review = await Review.findOne({
    where: {
      id: reviewId,
      userId: userId,
      isHidden: false,
    },
  });

  if (!review) {
    return {
      canEdit: false,
      error: 'review_not_found',
    };
  }

  // Check edit window
  const editWindowEnd = new Date(review.createdAt);
  editWindowEnd.setDate(editWindowEnd.getDate() + EDIT_WINDOW_DAYS);

  if (new Date() > editWindowEnd) {
    return {
      canEdit: false,
      error: 'edit_window_expired',
      metadata: {
        editWindowDays: EDIT_WINDOW_DAYS,
        editWindowEnds: editWindowEnd,
      },
    };
  }

  // Check edit count
  if (review.editCount >= MAX_EDITS) {
    return {
      canEdit: false,
      error: 'max_edits_reached',
      metadata: {
        maxEdits: MAX_EDITS,
        currentEdits: review.editCount,
      },
    };
  }

  return {
    canEdit: true,
    metadata: {
      editWindowEnds: editWindowEnd,
      editsRemaining: MAX_EDITS - review.editCount,
    },
  };
};

// New endpoint to check if user can edit
const canEdit = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    const result = await checkUserCanEdit(userId, reviewId);
    res.json(result);
  } catch (error) {
    console.error('Error checking edit ability:', error);
    res.status(500).json({ error: 'server_error' });
  }
};

// Modify updateReview to use the new helper
const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      rating,
      foodQuality,
      service,
      atmosphere,
      text,
      photosToKeep = [],
    } = req.body;
    const files = req.files;
    const userId = req.user.id;

    // Check if user can edit
    const canEditCheck = await checkUserCanEdit(userId, id);
    if (!canEditCheck.canEdit) {
      return res.status(403).json(canEditCheck);
    }

    const review = await Review.findOne({
      where: {
        id,
        userId: userId,
        isHidden: false,
      },
    });

    // Handle photos
    let updatedPhotoKeys = [];

    // 1. Keep only existing photos that are in photosToKeep array
    if (review.photos && Array.isArray(review.photos)) {
      updatedPhotoKeys = review.photos.filter((photoKey) => {
        const photoUrl = getMediaUrl(photoKey, 'image');
        return photosToKeep.includes(photoUrl);
      });
    }

    // 2. Add new photos if any
    if (files && files.length > 0) {
      const folder = `review_images/${review.id}`;
      const newImageKeys = await Promise.all(
        files.map((file) => uploadToS3(file, folder)),
      );
      updatedPhotoKeys = [...updatedPhotoKeys, ...newImageKeys];
    }

    // Update review content and ratings
    await review.update({
      rating: rating || review.rating,
      foodQuality: foodQuality || review.foodQuality,
      service: service || review.service,
      atmosphere: atmosphere || review.atmosphere,
      text: text || review.text,
      photos: updatedPhotoKeys,
      lastEditedAt: new Date(),
      editCount: review.editCount + 1,
    });

    // Check if the review has become high quality after the update
    const updatedReview = await Review.findByPk(review.id);
    if (isHighQualityReview(updatedReview, updatedPhotoKeys.length > 0)) {
      await UserAchievement.trackProgress(
        userId,
        'ELITE_REVIEWER',
        review.id, // Use review ID as tag
      );
    }

    if (
      rating !== review.rating ||
      foodQuality !== review.foodQuality ||
      service !== review.service ||
      atmosphere !== review.atmosphere
    ) {
      await calculateAverageRating(review.restaurantId);
    }

    const updatedReviewWithDetails = await Review.findByPk(review.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
    });

    const responseData = updatedReviewWithDetails.toJSON();
    if (responseData.photos && Array.isArray(responseData.photos)) {
      responseData.photos = responseData.photos.map((photoKey) =>
        getMediaUrl(photoKey, 'image'),
      );
    }

    res.json(responseData);
  } catch (error) {
    console.error('Error updating review:', error);
    if (error instanceof ValidationError) {
      return res
        .status(400)
        .json({ error: 'validation_error', details: error.message });
    }
    res.status(500).json({ error: 'server_error' });
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
  canReview,
  canEdit,
};
