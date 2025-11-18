const {
  Review,
  Restaurant,
  User,
  UserAchievement,
  sequelize,
} = require('../../models');
const { handleError } = require('../../utils/errorHandler');
const { ValidationError, Op } = require('sequelize');
const { getBaseFileName, getFolderFromKey } = require('../../utils/s3Upload');
const { deleteFromS3 } = require('../../utils/s3Delete');
const { calculateAverageRating } = require('../utils/ratingUtils');
const PointsService = require('../utils/pointsService');
const { getMediaUrl } = require('../../config/cdn');
const { sendPushNotification } = require('../../utils/pushNotificationService');
const {
  uploadImage,
  getImageUrls,
  UPLOAD_STRATEGY,
} = require('../../services/imageUploadService');

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
    let imageUploadResults = [];
    if (files && files.length > 0) {
      const folder = `review_images/${review.id}`;

      // Upload images with optimistic processing
      imageUploadResults = await Promise.all(
        files.map((file) =>
          uploadImage(file, folder, {
            strategy: UPLOAD_STRATEGY.OPTIMISTIC,
            entityType: 'review',
            entityId: review.id,
            priority: 8,
          })
        ),
      );

      const imageKeys = imageUploadResults.map(result => result.imageUrl);
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
          attributes: ['id', 'name'],
        },
      ],
    });

    // Transform image keys to URLs for response with variants
    const responseData = reviewWithDetails.toJSON();
    if (responseData.photos && Array.isArray(responseData.photos)) {
      responseData.photos = responseData.photos.map((photoKey, index) => {
        const imageUrls = getImageUrls(photoKey);
        const uploadResult = imageUploadResults[index];
        return {
          url: getMediaUrl(photoKey, 'image', 'medium'),
          imageUrls: imageUrls,
          processing: uploadResult && uploadResult.status === 'processing',
          jobId: uploadResult?.jobId,
        };
      });
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

    // Transform photo URLs with variants
    const transformedReviews = reviews.map((review) => {
      const reviewData = review.toJSON();
      if (reviewData.photos && Array.isArray(reviewData.photos)) {
        reviewData.photos = reviewData.photos.map((photoKey) => {
          const imageUrls = getImageUrls(photoKey);
          return {
            url: getMediaUrl(photoKey, 'image', 'medium'),
            imageUrls: imageUrls,
          };
        });
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
          attributes: ['id', 'email', 'name'],
        },
      ],
      order,
      limit,
      offset,
    });

    // Add virtual fields to each review and transform photos with variants
    const reviewsWithMeta = reviews.map((review) => {
      const reviewData = review.toJSON();
      // Transform photo keys to URLs with variants
      if (reviewData.photos && Array.isArray(reviewData.photos)) {
        reviewData.photos = reviewData.photos.map((photoKey) => {
          const imageUrls = getImageUrls(photoKey);
          return {
            url: getMediaUrl(photoKey, 'image', 'thumbnail'),
            imageUrls: imageUrls,
          };
        });
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
    let newImageUploadResults = [];
    if (files && files.length > 0) {
      const folder = `review_images/${review.id}`;

      // Upload new images with optimistic processing
      newImageUploadResults = await Promise.all(
        files.map((file) =>
          uploadImage(file, folder, {
            strategy: UPLOAD_STRATEGY.OPTIMISTIC,
            entityType: 'review',
            entityId: review.id,
            priority: 8,
          })
        ),
      );

      const newImageKeys = newImageUploadResults.map(result => result.imageUrl);
      updatedPhotoKeys = [...updatedPhotoKeys, ...newImageKeys];
    }

    // Delete old photos that were removed
    if (review.photos && Array.isArray(review.photos)) {
      const removedPhotos = review.photos.filter(
        (photoKey) => !updatedPhotoKeys.includes(photoKey)
      );
      for (const photoKey of removedPhotos) {
        const baseFileName = getBaseFileName(photoKey);
        const folder = getFolderFromKey(photoKey);
        const variants = ['thumb', 'medium', 'full'];
        for (const variant of variants) {
          const key = `${folder}/${baseFileName}-${variant}.jpg`;
          try {
            await deleteFromS3(key);
          } catch (error) {
            console.error(`Failed to delete ${key}:`, error);
          }
        }
      }
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
          attributes: ['id', 'name'],
        },
      ],
    });

    const responseData = updatedReviewWithDetails.toJSON();
    if (responseData.photos && Array.isArray(responseData.photos)) {
      responseData.photos = responseData.photos.map((photoKey, index) => {
        const imageUrls = getImageUrls(photoKey);
        // Check if this is a newly uploaded image
        const uploadResultIndex = index - (updatedPhotoKeys.length - newImageUploadResults.length);
        const uploadResult = uploadResultIndex >= 0 ? newImageUploadResults[uploadResultIndex] : null;
        return {
          url: getMediaUrl(photoKey, 'image', 'medium'),
          imageUrls: imageUrls,
          processing: uploadResult && uploadResult.status === 'processing',
          jobId: uploadResult?.jobId,
        };
      });
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

// Mark review as elite (sysadmin only)
const markReviewAsElite = async (req, res) => {
  try {
    const { id } = req.params;
    const pointsService = new PointsService(sequelize);

    // Find the review
    const review = await Review.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name'],
        },
      ],
    });

    if (!review) {
      return res.status(404).json({
        error: 'Review not found',
      });
    }

    // Check if already marked as elite
    if (review.isElite) {
      return res.status(400).json({
        error: 'Review is already marked as elite',
      });
    }

    // Mark as elite
    await review.update({ isElite: true });

    // Award elite review points
    await pointsService.addEliteReviewPoints(
      review.userId,
      review.id,
      review.restaurantId,
    );

    // Send push notification to user
    try {
      await sendPushNotification(review.userId, {
        title: 'Elite Review!',
        body: 'Vaš review je označen kao elitan! Dobili ste 3 bonus boda.',
        data: {
          type: 'elite_review',
          reviewId: review.id,
          restaurantName: review.restaurant.name,
        },
      });
    } catch (notificationError) {
      console.error(
        'Error sending elite review notification:',
        notificationError,
      );
      // Don't fail the request if notification fails
    }

    res.json({
      message: 'Review marked as elite successfully',
      review: {
        id: review.id,
        isElite: review.isElite,
        user: review.user,
        restaurant: review.restaurant,
      },
    });
  } catch (error) {
    console.error('Error marking review as elite:', error);
    handleError(res, error);
  }
};

const removeEliteFromReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
        { model: Restaurant, as: 'restaurant', attributes: ['id', 'name'] },
      ],
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (!review.isElite) {
      return res.status(400).json({ error: 'Review is not marked as elite' });
    }

    await review.update({ isElite: false });

    // TODO: Consider if we should remove the points that were awarded
    // For now, we'll just remove the elite status without touching points

    try {
      await sendPushNotification(review.userId, {
        title: 'Elite Status Removed',
        body: 'Elite status je uklonjen s vašeg review-a.',
        data: {
          type: 'elite_review_removed',
          reviewId: review.id,
          restaurantName: review.restaurant.name,
        },
      });
    } catch (notificationError) {
      console.error(
        'Error sending elite removal notification:',
        notificationError,
      );
      // Don't fail the request if notification fails
    }

    res.json({
      message: 'Elite status removed successfully',
      review: {
        id: review.id,
        isElite: review.isElite,
        user: review.user,
        restaurant: review.restaurant,
      },
    });
  } catch (error) {
    console.error('Error removing elite status:', error);
    handleError(res, error);
  }
};

module.exports = {
  createReview,
  getUserReviews,
  updateReview,
  deleteReview,
  getRestaurantReviews,
  canReview,
  canEdit,
  markReviewAsElite,
  removeEliteFromReview,
};
