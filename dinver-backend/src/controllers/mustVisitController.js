const { User, Restaurant, UserFavorite } = require('../../models');
const { getMediaUrl } = require('../../config/cdn');

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

module.exports = {
  addToMustVisit,
  removeFromMustVisit,
  getMustVisitList,
  checkIsMustVisit,
};
