const {
  UserRestaurant,
  Restaurant,
  UserOrganization,
} = require('../../models');

// Add a user to a restaurant with a specific permission
async function addUserToRestaurant(req, res) {
  try {
    const { userId, restaurantId, permission } = req.body;

    // Check if the user is an admin of the organization
    const userOrg = await UserOrganization.findOne({
      where: { userId: req.user.id, organizationId: req.body.organizationId },
    });

    if (!userOrg) {
      return res.status(403).json({
        error:
          'Access denied. Only organization admins can add users to a restaurant.',
      });
    }

    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const userRestaurant = await UserRestaurant.create({
      userId,
      restaurantId,
      role: permission,
    });

    res.status(201).json(userRestaurant);
  } catch (error) {
    res.status(500).json({
      error: 'An error occurred while adding the user to the restaurant',
    });
  }
}

// Remove a user from a restaurant
async function removeUserFromRestaurant(req, res) {
  try {
    const { userId, restaurantId } = req.body;

    // Check if the user is an admin of the organization
    const userOrg = await UserOrganization.findOne({
      where: { userId: req.user.id, organizationId: req.body.organizationId },
    });

    if (!userOrg) {
      return res.status(403).json({
        error:
          'Access denied. Only organization admins can remove users from a restaurant.',
      });
    }

    const userRestaurant = await UserRestaurant.findOne({
      where: { userId, restaurantId },
    });

    if (!userRestaurant) {
      return res.status(404).json({ error: 'User not found in restaurant' });
    }

    await userRestaurant.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      error: 'An error occurred while removing the user from the restaurant',
    });
  }
}

module.exports = {
  addUserToRestaurant,
  removeUserFromRestaurant,
};
