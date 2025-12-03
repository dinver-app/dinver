const { User, Restaurant, UserFavorite } = require('../../models');
const { getMediaUrl } = require('../../config/cdn');
const {
  getPlaceDetails,
  importUnclaimedRestaurant
} = require('../services/googlePlacesService');

// Dodaj restoran u favorite
const addToFavorites = async (req, res) => {
  try {
    const { restaurantId } = req.body;
    let userId;
    try {
      userId = req.user.id;
    } catch (error) {
      console.error('Error fetching user ID:', error);
      return res.status(500).json({ error: 'Failed to fetch user ID' });
    }

    let finalRestaurantId = restaurantId;
    let importedRestaurant = null;

    // Handle cached Google Places restaurants (lazy import on Save)
    if (restaurantId.startsWith('google:')) {
      const placeId = restaurantId.replace('google:', '');
      console.log(`[Favorite] Lazy import triggered for Google Place: ${placeId}`);

      // Check if already imported (race condition or previous import)
      let restaurant = await Restaurant.findOne({ where: { placeId } });

      if (!restaurant) {
        // Import now - user showed interest by clicking Save
        try {
          console.log('[Favorite] Importing restaurant from Google Places API');
          const placeDetails = await getPlaceDetails(placeId);
          restaurant = await importUnclaimedRestaurant(placeDetails);
          console.log(`[Favorite] Successfully imported: ${restaurant.name} (${restaurant.id})`);

          importedRestaurant = {
            id: restaurant.id,
            name: restaurant.name,
            slug: restaurant.slug,
          };
        } catch (importError) {
          console.error('[Favorite] Failed to import restaurant:', importError);
          return res.status(500).json({
            error: 'Failed to import restaurant from Google Places',
            details: importError.message
          });
        }
      } else {
        console.log(`[Favorite] Restaurant already imported: ${restaurant.name} (${restaurant.id})`);
        importedRestaurant = {
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
        };
      }

      finalRestaurantId = restaurant.id;
    }

    // Provjeri postoji li već u favoritima
    const existingFavorite = await UserFavorite.findOne({
      where: { userId: userId, restaurantId: finalRestaurantId },
    });

    if (existingFavorite) {
      return res.status(400).json({
        error: 'Restaurant already in favorites',
        restaurant: importedRestaurant // Return imported data even if already favorited
      });
    }

    await UserFavorite.create({ userId: userId, restaurantId: finalRestaurantId });

    const response = {
      message: 'Restaurant added to favorites',
      success: true
    };

    // Include imported restaurant data if it was a lazy import
    if (importedRestaurant) {
      response.restaurant = importedRestaurant;
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('Error adding to favorites:', error);
    res.status(500).json({ error: 'Failed to add restaurant to favorites' });
  }
};

// Ukloni restoran iz favorita
const removeFromFavorites = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const userId = req.user.id;

    const favorite = await UserFavorite.findOne({
      where: { userId: userId, restaurantId: restaurantId },
    });

    if (!favorite) {
      return res
        .status(404)
        .json({ error: 'Restaurant not found in favorites' });
    }

    await favorite.destroy();

    res.status(200).json({ message: 'Restaurant removed from favorites' });
  } catch (error) {
    console.error('Error removing from favorites:', error);
    res
      .status(500)
      .json({ error: 'Failed to remove restaurant from favorites' });
  }
};

// Dohvati sve favorite za korisnika
const getUserFavorites = async (req, res) => {
  try {
    let userId;
    try {
      userId = req.user.id;
    } catch (error) {
      console.error('Error fetching user ID:', error);
      return res.status(500).json({ error: 'Failed to fetch user ID' });
    }

    const user = await User.findByPk(userId, {
      include: [
        {
          model: Restaurant,
          as: 'favoriteRestaurants',
          through: { attributes: [] },
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
            'dinverRating',
            'dinverReviewsCount',
          ],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const favoritesWithUrls = user.favoriteRestaurants.map((r) => ({
      ...r.get(),
      thumbnailUrl: r.thumbnailUrl
        ? getMediaUrl(r.thumbnailUrl, 'image')
        : null,
    }));

    res.status(200).json(favoritesWithUrls);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
};

// Provjeri je li restoran u favoritima
const checkIsFavorite = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const userId = req.user.id;

    const favorite = await UserFavorite.findOne({
      where: { userId: userId, restaurantId: restaurantId },
    });

    res.status(200).json({ isFavorite: !!favorite });
  } catch (error) {
    console.error('Error checking favorite status:', error);
    res.status(500).json({ error: 'Failed to check favorite status' });
  }
};

module.exports = {
  addToFavorites,
  removeFromFavorites,
  getUserFavorites,
  checkIsFavorite,
};
