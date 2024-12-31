const {
  Organization,
  Restaurant,
  User,
  UserOrganization,
} = require('../../models');

// Create a new organization
async function createOrganization(req, res) {
  try {
    const { name } = req.body;
    const organization = await Organization.create({ name });
    res.status(201).json(organization);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while creating the organization' });
  }
}

// Update an organization
async function updateOrganization(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const organization = await Organization.findByPk(id);

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    await organization.update({ name });
    res.json(organization);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while updating the organization' });
  }
}

// Delete an organization
async function deleteOrganization(req, res) {
  try {
    const { id } = req.params;
    const organization = await Organization.findByPk(id);

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    await organization.destroy();
    res.status(204).send();
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while deleting the organization' });
  }
}

// Create a new restaurant
async function createRestaurant(req, res) {
  try {
    const { name, address, organizationId } = req.body;
    const restaurant = await Restaurant.create({
      name,
      address,
      organizationId,
    });
    res.status(201).json(restaurant);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while creating the restaurant' });
  }
}

// Update a restaurant
async function updateRestaurant(req, res) {
  try {
    const { id } = req.params;
    const { name, address } = req.body;
    const restaurant = await Restaurant.findByPk(id);

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    await restaurant.update({ name, address });
    res.json(restaurant);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while updating the restaurant' });
  }
}

// Delete a restaurant
async function deleteRestaurant(req, res) {
  try {
    const { id } = req.params;
    const restaurant = await Restaurant.findByPk(id);

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    await restaurant.destroy();
    res.status(204).send();
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while deleting the restaurant' });
  }
}

// Add a user to an organization
async function addUserToOrganization(req, res) {
  try {
    const { userId, organizationId } = req.body;
    const userOrganization = await UserOrganization.create({
      userId,
      organizationId,
    });
    res.status(201).json(userOrganization);
  } catch (error) {
    res.status(500).json({
      error: 'An error occurred while adding the user to the organization',
    });
  }
}

// Remove a user from an organization
async function removeUserFromOrganization(req, res) {
  try {
    const { userId, organizationId } = req.body;
    const userOrganization = await UserOrganization.findOne({
      where: { userId, organizationId },
    });

    if (!userOrganization) {
      return res.status(404).json({ error: 'User not found in organization' });
    }

    await userOrganization.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      error: 'An error occurred while removing the user from the organization',
    });
  }
}

module.exports = {
  createOrganization,
  updateOrganization,
  deleteOrganization,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  addUserToOrganization,
  removeUserFromOrganization,
};
