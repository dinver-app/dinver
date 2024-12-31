const { Restaurant, UserOrganization } = require('../../models');
const { recordInsight } = require('./insightController');

// Get all restaurants with specific fields
const getAllRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.findAll({
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
    });
    res.json(restaurants);
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

module.exports = {
  getAllRestaurants,
  getRestaurantDetails,
  viewRestaurant,
  updateRestaurant,
};
