const {
  RestaurantPost,
  PostView,
  PostInteraction,
  Restaurant,
  User,
  sequelize,
  UserFavorite,
} = require('../../models');
const { Op } = require('sequelize');
const { calculateDistance } = require('../../utils/distance');
const { getMediaUrl } = require('../../config/cdn');

const DISTANCE_FILTERS = {
  ALL: Infinity,
  NEAR_100: 100,
  NEAR_60: 60,
  NEAR_30: 30,
};

// Weights for scoring
const WEIGHTS = {
  recency: 0.3,
  engagement: 0.25,
  completion: 0.2,
  locality: 0.15,
  affinity: 0.1,
};

// Helper za računanje engagement score-a
const calculateEngagementScore = (post) => {
  const viewWeight = 1;
  const likeWeight = 2;
  const shareWeight = 3;
  const saveWeight = 2.5;
  const completionWeight = 2;

  return (
    (post.viewCount * viewWeight +
      post.likeCount * likeWeight +
      post.shareCount * shareWeight +
      post.saveCount * saveWeight) *
    (post.completionRate || 0.5) *
    completionWeight
  );
};

// Helper za računanje recency score-a
const calculateRecencyScore = (createdAt) => {
  const now = new Date();
  const postAge = now - new Date(createdAt);
  const hoursSincePosted = postAge / (1000 * 60 * 60);

  // Exponential decay - favorizira novije postove
  return Math.exp(-hoursSincePosted / 24);
};

// Helper za računanje locality score-a
const calculateLocalityScore = (
  userLat,
  userLng,
  restaurantLat,
  restaurantLng,
) => {
  if (!userLat || !userLng || !restaurantLat || !restaurantLng) {
    return 0.5; // Neutral score ako nemamo lokaciju
  }

  const distance = calculateDistance(
    userLat,
    userLng,
    restaurantLat,
    restaurantLng,
  );

  // Exponential decay based on distance (u km)
  return Math.exp(-distance / 10);
};

// Helper za računanje user affinity score-a
const calculateUserAffinityScore = async (userId, restaurantId, cuisine) => {
  if (!userId) return 0.5; // Neutral score za nelogirane korisnike

  const userInteractions = await PostInteraction.findAll({
    where: { userId },
    include: [
      {
        model: RestaurantPost,
        as: 'post',
        where: {
          [Op.or]: [{ restaurantId }, { cuisine }],
        },
      },
    ],
  });

  const viewHistory = await PostView.findAll({
    where: { userId },
    include: [
      {
        model: RestaurantPost,
        as: 'post',
        where: {
          [Op.or]: [{ restaurantId }, { cuisine }],
        },
      },
    ],
  });

  // Calculate affinity based on past interactions and views
  const interactionScore = userInteractions.length * 0.3;
  const viewScore = viewHistory.length * 0.2;
  const avgCompletionRate =
    viewHistory.reduce((acc, view) => acc + view.completionRate, 0) /
    (viewHistory.length || 1);

  return Math.min(1, interactionScore + viewScore + avgCompletionRate);
};

// Helper za transformaciju media URL-ova
const transformMediaUrls = (mediaUrls) => {
  if (!mediaUrls || !mediaUrls.length) return [];

  return mediaUrls.map((media) => {
    if (media.type === 'video') {
      return getMediaUrl(media.videoKey, 'video');
    } else {
      return getMediaUrl(media.imageKey, 'image');
    }
  });
};

// Main feed algorithm
const getFeed = async (req, res) => {
  try {
    const {
      cursor,
      limit = 20,
      userLat,
      userLng,
      distanceFilter = 'ALL',
      city,
    } = req.query;

    const userId = req.user?.id;
    const maxDistance = DISTANCE_FILTERS[distanceFilter] || Infinity;

    // Get user's favorite restaurants
    let favoriteRestaurantIds = [];
    if (userId) {
      const favorites = await UserFavorite.findAll({
        where: { userId },
        attributes: ['restaurantId'],
      });
      favoriteRestaurantIds = favorites.map((f) => f.restaurantId);
    }

    // Base query conditions
    const whereConditions = {
      ...(cursor ? { createdAt: { [Op.lt]: new Date(cursor) } } : {}),
      ...(city ? { city } : {}),
    };

    // Fetch posts with restaurant info
    let posts = await RestaurantPost.findAll({
      where: whereConditions,
      include: [
        {
          model: Restaurant,
          required: true,
          as: 'restaurant',
          attributes: ['id', 'name', 'latitude', 'longitude', 'address'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: limit * 2, // Fetch extra to filter by distance
    });

    // Get user interactions if logged in
    let userInteractions = new Map();
    if (userId) {
      const interactions = await PostInteraction.findAll({
        where: {
          userId,
          postId: posts.map((post) => post.id),
        },
        attributes: ['postId', 'interactionType'],
      });

      interactions.forEach((interaction) => {
        if (!userInteractions.has(interaction.postId)) {
          userInteractions.set(interaction.postId, new Set());
        }
        userInteractions
          .get(interaction.postId)
          .add(interaction.interactionType);
      });
    }

    // Filter and score posts
    const scoredPosts = await Promise.all(
      posts.map(async (post) => {
        const distance = calculateDistance(
          userLat,
          userLng,
          post.restaurant.latitude,
          post.restaurant.longitude,
        );

        // Skip if beyond max distance filter
        if (distance > maxDistance) {
          return null;
        }

        // Calculate base scores
        const ageInHours = (Date.now() - post.createdAt) / (1000 * 60 * 60);
        const recencyScore = Math.exp(-ageInHours / 72); // Decay over 3 days

        const engagementScore =
          (post.viewCount + post.shareCount * 3 + post.saveCount * 2) /
          (ageInHours + 1);

        const localityScore = Math.exp(-distance / 50); // 50km scale factor

        // Calculate user affinity score
        let affinityScore = 0;
        if (userId) {
          // Check if restaurant is favorited
          const isFavorite = favoriteRestaurantIds.includes(post.restaurant.id);
          if (isFavorite) affinityScore += 0.5;

          // Get user's past interactions with this restaurant's posts
          const pastInteractions = await PostInteraction.count({
            where: {
              userId,
              postId: { [Op.ne]: post.id }, // Exclude current post
              '$post.restaurantId$': post.restaurant.id,
            },
            include: [
              {
                model: RestaurantPost,
                as: 'post',
                attributes: [],
              },
            ],
          });

          if (pastInteractions > 0) {
            affinityScore += Math.min(0.5, pastInteractions * 0.1);
          }
        }

        // Get user interactions for this post
        const postInteractions = userInteractions.get(post.id) || new Set();

        // Weighted final score
        const finalScore =
          WEIGHTS.recency * recencyScore +
          WEIGHTS.engagement * engagementScore +
          WEIGHTS.completion * (post.completionRate || 0) +
          WEIGHTS.locality * localityScore +
          WEIGHTS.affinity * affinityScore;

        const postData = {
          ...post.toJSON(),
          _score: finalScore,
          _distance: distance,
          isLiked: postInteractions.has('like'),
          isSaved: postInteractions.has('save'),
          isShared: postInteractions.has('share'),
          mediaUrls: transformMediaUrls(post.mediaUrls),
        };

        return postData;
      }),
    );

    // Remove null posts (filtered by distance) and sort by score
    const filteredPosts = scoredPosts
      .filter((post) => post !== null)
      .sort((a, b) => b._score - a._score)
      .slice(0, limit);

    // Get next cursor
    const nextCursor =
      filteredPosts.length > 0
        ? filteredPosts[filteredPosts.length - 1].createdAt.toISOString()
        : null;

    res.json({
      posts: filteredPosts,
      nextCursor,
      distanceFilter,
      hasMore: filteredPosts.length === limit,
    });
  } catch (error) {
    console.error('Feed error:', error);
    res.status(500).json({ error: 'Error fetching feed' });
  }
};

// Record post interaction (like, save, share, etc.)
const recordInteraction = async (req, res) => {
  try {
    const { postId } = req.params;
    const { interactionType, timeSpentBefore, metadata } = req.body;
    const userId = req.user.id;

    // Validate post exists
    const post = await RestaurantPost.findByPk(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check for existing interaction
    const existingInteraction = await PostInteraction.findOne({
      where: {
        postId,
        userId,
        interactionType,
      },
    });

    // Handle removing interaction (unlike, unsave)
    if (existingInteraction) {
      if (interactionType === 'like' || interactionType === 'save') {
        await existingInteraction.destroy();

        // Update corresponding counter
        if (interactionType === 'like') {
          await post.decrement('likeCount');
        } else if (interactionType === 'save') {
          await post.decrement('saveCount');
        }

        // Update engagement score
        const newEngagementScore = calculateEngagementScore(
          await RestaurantPost.findByPk(postId),
        );
        await post.update({ engagementScore: newEngagementScore });

        return res.json({
          success: true,
          action: 'removed',
          interactionType,
        });
      } else {
        // For other interaction types (share, click_profile, etc.), don't allow duplicates
        return res.status(409).json({
          error: 'Interaction already exists',
          message: `You have already performed this ${interactionType} action on this post`,
        });
      }
    }

    // Create new interaction
    const interaction = await PostInteraction.create({
      postId,
      userId,
      interactionType,
      timeSpentBefore,
      metadata,
    });

    // Update corresponding counter on post
    if (interactionType === 'share') {
      await post.increment('shareCount');
    } else if (interactionType === 'save') {
      await post.increment('saveCount');
    } else if (interactionType === 'like') {
      await post.increment('likeCount');
    }

    // Update engagement score
    const newEngagementScore = calculateEngagementScore(
      await RestaurantPost.findByPk(postId),
    );
    await post.update({ engagementScore: newEngagementScore });

    res.json({
      success: true,
      action: 'added',
      interactionType,
      interaction,
    });
  } catch (error) {
    console.error('Error recording interaction:', error);
    // Check if error is due to unique constraint violation
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        error: 'Duplicate interaction',
        message: 'This interaction has already been recorded',
      });
    }
    res.status(500).json({ error: 'Failed to record interaction' });
  }
};

// Update view metrics
const updateViewMetrics = async (req, res) => {
  try {
    const { postId } = req.params;
    const { completionRate = 1, watchTime, deviceId } = req.body;
    const userId = req.user?.id;

    // If no user is logged in, require deviceId
    if (!userId && !deviceId) {
      return res
        .status(400)
        .json({ error: 'deviceId is required for anonymous users' });
    }

    // Get current hour (0-23)
    const currentHour = new Date().getHours();

    // Update or create view record
    const view = await PostView.findOne({
      where: {
        postId,
        ...(userId ? { userId } : { deviceId }),
        createdAt: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24h
        },
      },
    });

    if (view) {
      await view.update({
        ...(watchTime && { watchTime: Math.max(view.watchTime, watchTime) }),
        ...(completionRate && {
          completionRate: Math.max(view.completionRate, completionRate),
        }),
        timeOfDay: currentHour,
      });
    } else {
      await PostView.create({
        postId,
        userId,
        deviceId,
        isAnonymous: !userId,
        watchTime: watchTime || 0,
        completionRate: completionRate || 1,
        timeOfDay: currentHour,
      });

      // Increment viewCount only for new views
      await RestaurantPost.increment('viewCount', { where: { id: postId } });

      // Update post's peak hours data
      const post = await RestaurantPost.findByPk(postId);
      const peakHours = post.peakHours || {};
      peakHours[currentHour] = (peakHours[currentHour] || 0) + 1;
      await post.update({ peakHours });
    }

    // Update post metrics
    const post = await RestaurantPost.findByPk(postId);

    const newEngagementScore = calculateEngagementScore(post);
    await post.update({
      engagementScore: newEngagementScore,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating view metrics:', error);
    res.status(500).json({ error: 'Failed to update view metrics' });
  }
};

module.exports = {
  getFeed,
  recordInteraction,
  updateViewMetrics,
};
