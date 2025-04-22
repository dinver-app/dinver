const { Review, Restaurant, User } = require('../../models');
const { handleError } = require('../../utils/errorHandler');
const {
  updateAchievementProgress,
  updateEliteReviewerProgress,
} = require('./achievementController');
const { Op } = require('sequelize');

const EDIT_WINDOW_DAYS = 7;
const MAX_EDITS = 1;

const createReview = async (req, res) => {
  try {
    const userId = req.user.id;
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

    // Check if user already reviewed this restaurant
    const existingReview = await Review.findOne({
      where: {
        user_id: userId,
        restaurant_id: restaurantId,
        is_hidden: false,
      },
    });

    if (existingReview) {
      return res.status(400).json({
        error: 'Već ste napisali recenziju za ovaj restoran',
      });
    }

    const review = await Review.create({
      user_id: userId,
      restaurant_id: restaurantId,
      rating,
      food_quality,
      service,
      atmosphere,
      value_for_money,
      text,
      photos: photos || [],
      is_verified_reviewer: false,
      is_hidden: false,
      edit_count: 0,
      edit_history: [],
    });

    // Update restaurant's average rating
    await updateRestaurantRating(restaurantId);

    // Update achievement progress for reviews
    await updateAchievementProgress(userId, 'ELITE_REVIEWER');

    // Ažuriraj Elite Reviewer achievement
    const qualityReviewCount = await Review.count({
      where: {
        user_id: userId,
        text: {
          [Op.and]: [
            { [Op.ne]: null },
            { [Op.regexp]: '.{120,}' }, // Recenzije duže od 120 znakova
          ],
        },
      },
    });

    await updateEliteReviewerProgress(userId, qualityReviewCount);

    res.status(201).json({
      ...review.toJSON(),
      can_edit: true,
      is_edited: false,
    });
  } catch (error) {
    handleError(res, error);
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

    // Add virtual fields to each review
    const reviewsWithMeta = reviews.map((review) => ({
      ...review.toJSON(),
      is_edited: review.last_edited_at !== null,
      can_edit: review.can_edit,
    }));

    res.json(reviewsWithMeta);
  } catch (error) {
    handleError(res, error);
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
          attributes: ['id', 'firstName', 'lastName'],
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
    const userId = req.user.id;
    const {
      rating,
      food_quality,
      service,
      atmosphere,
      value_for_money,
      text,
      photos,
    } = req.body;

    const review = await Review.findOne({
      where: {
        id,
        user_id: userId,
        is_hidden: false,
      },
    });

    if (!review) {
      return res.status(404).json({
        error: 'Recenzija nije pronađena ili nemate pravo pristupa',
      });
    }

    // Check if review can be edited
    if (!review.can_edit) {
      return res.status(403).json({
        error:
          'Recenzija se više ne može uređivati. Dozvoljeno je uređivanje unutar 7 dana od objave ili maksimalno jednom nakon toga.',
      });
    }

    // Save current state to edit history
    const currentState = {
      rating: review.rating,
      food_quality: review.food_quality,
      service: review.service,
      atmosphere: review.atmosphere,
      value_for_money: review.value_for_money,
      text: review.text,
      photos: review.photos,
      edited_at: new Date(),
    };

    await review.update({
      rating: rating || review.rating,
      food_quality: food_quality || review.food_quality,
      service: service || review.service,
      atmosphere: atmosphere || review.atmosphere,
      value_for_money: value_for_money || review.value_for_money,
      text: text || review.text,
      photos: photos || review.photos,
      last_edited_at: new Date(),
      edit_count: review.edit_count + 1,
      edit_history: [...review.edit_history, currentState],
    });

    // Update restaurant's average rating
    await updateRestaurantRating(review.restaurant_id);

    // Reload review to get updated virtual fields
    await review.reload();

    res.json({
      ...review.toJSON(),
      is_edited: true,
      can_edit: review.can_edit,
    });
  } catch (error) {
    handleError(res, error);
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
      return res.status(404).json({
        error: 'Recenzija nije pronađena ili nemate pravo pristupa',
      });
    }

    // Soft delete - hide the review instead of deleting it
    await review.update({ is_hidden: true });

    // Update restaurant's average rating
    await updateRestaurantRating(review.restaurant_id);

    res.status(204).send();
  } catch (error) {
    handleError(res, error);
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
