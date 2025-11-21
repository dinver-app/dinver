const { User, Restaurant, UserFavorite, UserSettings, UserFollow } = require('../../models');
const { getMediaUrl } = require('../../config/cdn');

/**
 * Helper function to check if viewer can see target user's profile
 * @param {string} targetUserId - User whose profile is being viewed
 * @param {string|null} viewerUserId - User viewing the profile (null if unauthenticated)
 * @returns {Promise<{canView: boolean, reason?: string}>}
 */
const canViewUserProfile = async (targetUserId, viewerUserId) => {
  // Owner can always view their own profile
  if (viewerUserId && targetUserId === viewerUserId) {
    return { canView: true };
  }

  // Get target user's privacy settings
  const userSettings = await UserSettings.findOne({
    where: { userId: targetUserId },
  });

  if (!userSettings) {
    return { canView: false, reason: 'User settings not found' };
  }

  const profileVisibility = userSettings.profileVisibility;

  // Public profile - everyone can see (including unauthenticated)
  if (profileVisibility === 'public') {
    return { canView: true };
  }

  // Private profiles require authentication
  if (!viewerUserId) {
    return { canView: false, reason: 'Authentication required for non-public profile' };
  }

  // Followers only - check if viewer follows target user
  if (profileVisibility === 'followers') {
    const isFollowing = await UserFollow.findOne({
      where: {
        followerId: viewerUserId,
        followingId: targetUserId,
      },
    });

    if (!isFollowing) {
      return { canView: false, reason: 'You must follow this user to view their profile' };
    }
    return { canView: true };
  }

  // Buddies only - check if users follow each other (mutual follow)
  if (profileVisibility === 'buddies') {
    const [viewerFollowsTarget, targetFollowsViewer] = await Promise.all([
      UserFollow.findOne({
        where: {
          followerId: viewerUserId,
          followingId: targetUserId,
        },
      }),
      UserFollow.findOne({
        where: {
          followerId: targetUserId,
          followingId: viewerUserId,
        },
      }),
    ]);

    if (!viewerFollowsTarget || !targetFollowsViewer) {
      return { canView: false, reason: 'You must be buddies (mutual follow) to view this profile' };
    }
    return { canView: true };
  }

  return { canView: false, reason: 'Invalid privacy setting' };
};

// Add restaurant to Must Visit list
const addToMustVisit = async (req, res) => {
  try {
    const { restaurantId } = req.body;
    const userId = req.user.id;

    // Validate restaurant exists
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Check if already in Must Visit (active entry)
    const existingFavorite = await UserFavorite.findOne({
      where: {
        userId: userId,
        restaurantId: restaurantId,
        removedAt: null, // Only check active entries
      },
    });

    if (existingFavorite) {
      return res
        .status(400)
        .json({ error: 'Restaurant already in Must Visit list' });
    }

    // Check if there's a soft-deleted entry we can restore
    const softDeletedFavorite = await UserFavorite.findOne({
      where: {
        userId: userId,
        restaurantId: restaurantId,
      },
      order: [['removedAt', 'DESC']], // Get most recent
    });

    if (softDeletedFavorite && softDeletedFavorite.removedAt) {
      // Restore the soft-deleted entry
      await softDeletedFavorite.update({
        removedAt: null,
        removedForVisitId: null,
      });

      return res
        .status(200)
        .json({ message: 'Restaurant added to Must Visit list' });
    }

    // Create new entry
    await UserFavorite.create({
      userId: userId,
      restaurantId: restaurantId,
    });

    res.status(201).json({ message: 'Restaurant added to Must Visit list' });
  } catch (error) {
    console.error('Error adding to Must Visit:', error);
    res
      .status(500)
      .json({ error: 'Failed to add restaurant to Must Visit list' });
  }
};

// Remove restaurant from Must Visit list (permanent removal)
const removeFromMustVisit = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const userId = req.user.id;

    const favorite = await UserFavorite.findOne({
      where: {
        userId: userId,
        restaurantId: restaurantId,
        removedAt: null, // Only active entries
      },
    });

    if (!favorite) {
      return res
        .status(404)
        .json({ error: 'Restaurant not found in Must Visit list' });
    }

    // Permanently delete (user manually removed it, not due to visit)
    await favorite.destroy();

    res
      .status(200)
      .json({ message: 'Restaurant removed from Must Visit list' });
  } catch (error) {
    console.error('Error removing from Must Visit:', error);
    res
      .status(500)
      .json({ error: 'Failed to remove restaurant from Must Visit list' });
  }
};

// Get user's Must Visit list (only active entries)
const getMustVisitList = async (req, res) => {
  try {
    const userId = req.user.id;

    const favorites = await UserFavorite.findAll({
      where: {
        userId: userId,
        removedAt: null, // Only active entries
      },
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: [
            'id',
            'name',
            'rating',
            'priceLevel',
            'address',
            'place',
            'isClaimed',
            'thumbnailUrl',
            'userRatingsTotal',
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const favoritesWithUrls = favorites.map((fav) => ({
      id: fav.id,
      addedAt: fav.createdAt,
      restaurant: {
        ...fav.restaurant.get(),
        thumbnailUrl: fav.restaurant.thumbnailUrl
          ? getMediaUrl(fav.restaurant.thumbnailUrl, 'image')
          : null,
      },
    }));

    res.status(200).json(favoritesWithUrls);
  } catch (error) {
    console.error('Error fetching Must Visit list:', error);
    res.status(500).json({ error: 'Failed to fetch Must Visit list' });
  }
};

// Check if restaurant is in Must Visit list
const checkIsMustVisit = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const userId = req.user.id;

    const favorite = await UserFavorite.findOne({
      where: {
        userId: userId,
        restaurantId: restaurantId,
        removedAt: null, // Only active entries
      },
    });

    res.status(200).json({ isMustVisit: !!favorite });
  } catch (error) {
    console.error('Error checking Must Visit status:', error);
    res.status(500).json({ error: 'Failed to check Must Visit status' });
  }
};

// Get other user's Must Visit list (with privacy check)
const getUserMustVisitList = async (req, res) => {
  try {
    const { userId: targetUserId } = req.params;
    const viewerUserId = req.user?.id || null; // Optional authentication

    // Check if target user exists
    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check privacy settings
    const { canView, reason } = await canViewUserProfile(targetUserId, viewerUserId);
    if (!canView) {
      return res.status(403).json({ error: reason || 'Cannot view this profile' });
    }

    // Fetch must-visit list (only active entries)
    const favorites = await UserFavorite.findAll({
      where: {
        userId: targetUserId,
        removedAt: null, // Only active entries
      },
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: [
            'id',
            'name',
            'rating',
            'priceLevel',
            'address',
            'place',
            'isClaimed',
            'thumbnailUrl',
            'userRatingsTotal',
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const favoritesWithUrls = favorites.map((fav) => ({
      id: fav.id,
      addedAt: fav.createdAt,
      restaurant: {
        ...fav.restaurant.get(),
        thumbnailUrl: fav.restaurant.thumbnailUrl
          ? getMediaUrl(fav.restaurant.thumbnailUrl, 'image')
          : null,
      },
    }));

    res.status(200).json(favoritesWithUrls);
  } catch (error) {
    console.error('Error fetching user Must Visit list:', error);
    res.status(500).json({ error: 'Failed to fetch Must Visit list' });
  }
};

// Get other user's Visited list (with privacy check)
const getUserVisitedList = async (req, res) => {
  try {
    const { userId: targetUserId } = req.params;
    const viewerUserId = req.user?.id || null; // Optional authentication

    // Check if target user exists
    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check privacy settings
    const { canView, reason } = await canViewUserProfile(targetUserId, viewerUserId);
    if (!canView) {
      return res.status(403).json({ error: reason || 'Cannot view this profile' });
    }

    // Fetch visited list (entries that were removed due to visit)
    const visitedRestaurants = await UserFavorite.findAll({
      where: {
        userId: targetUserId,
        removedAt: { [require('sequelize').Op.ne]: null }, // Has been removed
        removedForVisitId: { [require('sequelize').Op.ne]: null }, // Removed due to visit
      },
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: [
            'id',
            'name',
            'rating',
            'priceLevel',
            'address',
            'place',
            'isClaimed',
            'thumbnailUrl',
            'userRatingsTotal',
          ],
        },
      ],
      order: [['removedAt', 'DESC']], // Most recently visited first
    });

    const visitedWithUrls = visitedRestaurants.map((visited) => ({
      id: visited.id,
      addedAt: visited.createdAt,
      visitedAt: visited.removedAt,
      visitId: visited.removedForVisitId,
      restaurant: {
        ...visited.restaurant.get(),
        thumbnailUrl: visited.restaurant.thumbnailUrl
          ? getMediaUrl(visited.restaurant.thumbnailUrl, 'image')
          : null,
      },
    }));

    res.status(200).json(visitedWithUrls);
  } catch (error) {
    console.error('Error fetching user Visited list:', error);
    res.status(500).json({ error: 'Failed to fetch Visited list' });
  }
};

module.exports = {
  addToMustVisit,
  removeFromMustVisit,
  getMustVisitList,
  checkIsMustVisit,
  getUserMustVisitList,
  getUserVisitedList,
};
