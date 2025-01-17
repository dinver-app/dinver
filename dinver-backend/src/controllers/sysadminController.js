const {
  Organization,
  Restaurant,
  User,
  UserOrganization,
} = require('../../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET;

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

// Add a restaurant to an organization
async function addRestaurantToOrganization(req, res) {
  try {
    const { restaurantId, organizationId } = req.body;

    // Check if the organization exists
    const organization = await Organization.findByPk(organizationId);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check if the restaurant exists
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Associate the restaurant with the organization
    await restaurant.update({ organizationId });
    res
      .status(200)
      .json({ message: 'Restaurant added to organization successfully' });
  } catch (error) {
    res.status(500).json({
      error:
        'An error occurred while adding the restaurant to the organization',
    });
  }
}

// Login function
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '1h',
    });

    // Set the token as an HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 3600000,
    });

    res.json({ message: 'Login successful' });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred during login' });
  }
}

async function logout(req, res) {
  res.status(200).json({ message: 'Logout successful' });
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
  addRestaurantToOrganization,
  login,
  logout,
};
