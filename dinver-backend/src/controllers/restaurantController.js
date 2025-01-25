const { Restaurant, UserOrganization, UserAdmin } = require('../../models');
const { recordInsight } = require('./insightController');
const { Op } = require('sequelize');

// Get all restaurants with specific fields
const getAllRestaurants = async (req, res) => {
  try {
    const totalRestaurantsCount = await Restaurant.count();

    const claimedRestaurantsCount = await UserAdmin.count({
      distinct: true,
      col: 'restaurantId',
    });

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const { search } = req.query;

    const generateSearchVariations = (search) => {
      if (!search) return [];

      const variations = [search];
      const replacements = { č: 'Č', đ: 'Đ', ž: 'Ž', š: 'Š', ć: 'Ć' };

      for (const [lower, upper] of Object.entries(replacements)) {
        if (search.includes(lower)) {
          variations.push(search.replace(new RegExp(lower, 'g'), upper));
        }
      }

      return variations;
    };

    const searchVariations = generateSearchVariations(search);

    const whereClause =
      searchVariations.length > 0
        ? {
            [Op.or]: searchVariations.flatMap((variation) => [
              { name: { [Op.iLike]: `%${variation}%` } },
              { address: { [Op.iLike]: `%${variation}%` } },
            ]),
          }
        : {};

    const { count, rows: restaurants } = await Restaurant.findAndCountAll({
      where: whereClause,
      attributes: [
        'id',
        'name',
        'address',
        'latitude',
        'longitude',
        'rating',
        'user_ratings_total',
        'price_level',
        'opening_hours',
        'icon_url',
      ],
      limit,
      offset,
    });

    const restaurantsWithStatus = await Promise.all(
      restaurants.map(async (restaurant) => {
        const isClaimed = await UserAdmin.findOne({
          where: { restaurantId: restaurant.id },
          attributes: ['restaurantId'],
        });

        return {
          ...restaurant.get(),
          isOpen: isRestaurantOpen(restaurant.opening_hours),
          isClaimed: !!isClaimed,
        };
      }),
    );

    res.json({
      totalRestaurants: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      restaurants: restaurantsWithStatus,
      totalRestaurantsCount,
      claimedRestaurantsCount,
    });
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while fetching restaurants' });
  }
};

// Get detailed information for a specific restaurant by ID
const getRestaurantDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    res.json(restaurant);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while fetching restaurant details' });
  }
};

async function viewRestaurant(req, res) {
  try {
    const { id } = req.params;
    const restaurant = await Restaurant.findByPk(id);

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Record the insight
    await recordInsight(
      req.user ? req.user.id : null,
      restaurant.id,
      null,
      'view',
      null,
    );

    res.json(restaurant);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while fetching the restaurant' });
  }
}

// Update restaurant details
async function updateRestaurant(req, res) {
  try {
    const { id } = req.params;
    const { name, description, address, openingHours } = req.body;

    // Check if the user is an owner of the organization
    const userOrg = await UserOrganization.findOne({
      where: {
        userId: req.user.id,
        organizationId: req.body.organizationId,
        role: 'owner',
      },
    });

    if (!userOrg) {
      return res.status(403).json({
        error: 'Access denied. Only owners can update restaurant details.',
      });
    }

    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    await restaurant.update({ name, description, address, openingHours });
    res.json(restaurant);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while updating the restaurant' });
  }
}

function isRestaurantOpen(openingHours) {
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.getHours() * 100 + now.getMinutes();

  if (!openingHours || !openingHours.periods) {
    return false;
  }

  for (const period of openingHours.periods) {
    const openDay = period.open.day;
    const openTime = parseInt(period.open.time);
    const closeDay = period.close.day;
    const closeTime = parseInt(period.close.time);

    if (
      (currentDay === openDay && currentTime >= openTime) ||
      (currentDay === closeDay && currentTime < closeTime) ||
      (openDay < closeDay && currentDay > openDay && currentDay < closeDay) ||
      (openDay > closeDay && (currentDay > openDay || currentDay < closeDay))
    ) {
      return true;
    }
  }
  return false;
}

module.exports = {
  getAllRestaurants,
  getRestaurantDetails,
  viewRestaurant,
  updateRestaurant,
};
