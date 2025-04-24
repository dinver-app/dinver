const { User, Restaurant, UserFavorite } = require('../../models');
const PointsService = require('../../utils/pointsService');

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

    // Provjeri postoji li već u favoritima
    const existingFavorite = await UserFavorite.findOne({
      where: { userId: userId, restaurantId: restaurantId },
    });

    if (existingFavorite) {
      return res.status(400).json({ error: 'Restaurant already in favorites' });
    }

    await UserFavorite.create({ userId: userId, restaurantId: restaurantId });

    res.status(201).json({ message: 'Restaurant added to favorites' });
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
          attributes: ['id', 'name', 'rating', 'priceLevel', 'address'],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user.favoriteRestaurants);
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
