const {
  User,
  UserPoints,
  Review,
  UserFavorite,
  Reservation,
  Restaurant,
} = require('../../models');
const { sequelize } = require('../../models');

const updateUserLanguage = async (req, res) => {
  const { language } = req.body;
  const user = await User.findByPk(req.user.id);
  await user.update({ language });
  res.status(200).json({ message: 'Language updated successfully' });
};

const getUserLanguage = async (req, res) => {
  const user = await User.findByPk(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.status(200).json({ language: user.language });
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId, {
      attributes: [
        'id',
        'firstName',
        'lastName',
        'bio',
        'streetAddress',
        'city',
        'country',
        'phone',
        'email',
        'birthDate',
      ],
      include: [
        {
          model: UserPoints,
          as: 'points',
          attributes: ['totalPoints', 'level'],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [reviewCount, favoriteCount, completedReservationsCount] =
      await Promise.all([
        Review.count({ where: { userId } }),
        UserFavorite.count({ where: { userId } }),
        Reservation.count({ where: { userId, status: 'completed' } }),
      ]);

    const response = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.bio,
      location: {
        street: user.streetAddress,
        city: user.city,
        country: user.country,
      },
      stats: {
        points: user.points?.totalPoints || 0,
        level: user.points?.level || 1,
        reviewCount,
        favoriteCount,
        completedReservationsCount,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      firstName,
      lastName,
      bio,
      streetAddress,
      city,
      country,
      phone,
      birthDate,
    } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ažuriramo samo poslane podatke (email se ignorira)
    const updates = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (bio !== undefined) updates.bio = bio;
    if (streetAddress !== undefined) updates.streetAddress = streetAddress;
    if (city !== undefined) updates.city = city;
    if (country !== undefined) updates.country = country;
    if (phone !== undefined) updates.phone = phone;
    if (birthDate !== undefined) updates.birthDate = birthDate;

    await user.update(updates);

    // Vraćamo ažurirane podatke
    const updatedUser = await User.findByPk(userId, {
      attributes: [
        'id',
        'firstName',
        'lastName',
        'bio',
        'streetAddress',
        'city',
        'country',
        'phone',
        'email',
        'birthDate',
      ],
    });

    const response = {
      id: updatedUser.id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      bio: updatedUser.bio,
      location: {
        street: updatedUser.streetAddress,
        city: updatedUser.city,
        country: updatedUser.country,
      },
      contact: {
        phone: updatedUser.phone,
        email: updatedUser.email,
      },
      birthDate: updatedUser.birthDate,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
};

const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const [userPoints, reviewStats, favoriteRestaurants, reservationStats] =
      await Promise.all([
        // Bodovi i level
        UserPoints.findOne({
          where: { userId },
          attributes: ['totalPoints', 'level', 'pointsToNextLevel'],
        }),

        // Statistika recenzija
        Review.findAll({
          where: { userId },
          attributes: [
            [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
            [sequelize.fn('AVG', sequelize.col('rating')), 'averageRating'],
            [sequelize.fn('MAX', sequelize.col('createdAt')), 'lastReviewDate'],
          ],
        }),

        // Omiljeni restorani
        UserFavorite.findAll({
          where: { userId },
          include: [
            {
              model: Restaurant,
              as: 'restaurant',
              attributes: ['id', 'name'],
            },
          ],
          limit: 5,
          order: [['createdAt', 'DESC']],
        }),

        // Statistika rezervacija
        Reservation.findAll({
          where: { userId },
          attributes: [
            'status',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          ],
          group: ['status'],
        }),
      ]);

    // Formatiramo statistiku rezervacija
    const reservationCounts = {
      completed: 0,
      pending: 0,
      cancelled: 0,
    };
    reservationStats.forEach((stat) => {
      reservationCounts[stat.status] = parseInt(stat.get('count'));
    });

    const response = {
      points: {
        total: userPoints?.totalPoints || 0,
        level: userPoints?.level || 1,
        pointsToNextLevel: userPoints?.pointsToNextLevel || 100,
      },
      reviews: {
        total: parseInt(reviewStats[0].get('total')) || 0,
        averageRating: parseFloat(reviewStats[0].get('averageRating')) || 0,
        lastReviewDate: reviewStats[0].get('lastReviewDate'),
      },
      favorites: {
        total: favoriteRestaurants.length,
        recent: favoriteRestaurants.map((fav) => ({
          id: fav.restaurant.id,
          name: fav.restaurant.name,
        })),
      },
      reservations: {
        ...reservationCounts,
        total: Object.values(reservationCounts).reduce((a, b) => a + b, 0),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
};

module.exports = {
  updateUserLanguage,
  getUserLanguage,
  getUserById,
  getUserProfile,
  updateUserProfile,
  getUserStats,
};
