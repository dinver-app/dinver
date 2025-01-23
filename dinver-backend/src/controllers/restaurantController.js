const { Restaurant, UserOrganization } = require('../../models');
const { recordInsight } = require('./insightController');
const { Op } = require('sequelize');

// Get all restaurants with specific fields
const getAllRestaurants = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const { search } = req.query;

    console.log(search);

    const whereClause = search
      ? {
          [Op.or]: [
            { name: { [Op.iLike]: `%${search}%` } },
            { address: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : {};

    const { count, rows: restaurants } = await Restaurant.findAndCountAll({
      where: whereClause,
      attributes: [
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

    const restaurantsWithOpenStatus = restaurants.map((restaurant) => ({
      ...restaurant.get(),
      isOpen: isRestaurantOpen(restaurant.opening_hours),
    }));

    res.json({
      totalRestaurants: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      restaurants: restaurantsWithOpenStatus,
    });
  } catch (error) {
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
