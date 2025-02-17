const { Restaurant, UserAdmin, User } = require('../../models');
const bcrypt = require('bcrypt');
const { generateTokens } = require('../../utils/tokenUtils');

async function adminLogin(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if the user is an admin
    const admin = await UserAdmin.findOne({
      where: { userId: user.id },
    });

    if (!admin) {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true });
    res.cookie('token', accessToken, { httpOnly: true, secure: true });

    res
      .status(200)
      .json({ message: 'Login successful', language: user.language });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred during login' });
  }
}

async function getAdminRestaurants(req, res) {
  try {
    const userId = req.user.id;

    const adminRestaurants = await UserAdmin.findAll({
      where: { userId },
      attributes: ['restaurantId'],
    });

    const restaurantIds = adminRestaurants.map((admin) => admin.restaurantId);

    const restaurants = await Restaurant.findAll({
      where: { id: restaurantIds },
      attributes: ['id', 'name', 'slug'],
    });

    res.json(restaurants);
  } catch (error) {
    console.error('Error fetching admin restaurants:', error);
    res.status(500).json({ error: 'Failed to fetch admin restaurants' });
  }
}

// Get all admins for a restaurant
async function getRestaurantAdmins(req, res) {
  try {
    const { restaurantId } = req.params;
    const admins = await UserAdmin.findAll({
      where: { restaurantId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName'],
        },
      ],
    });
    res.json(admins);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching admins' });
  }
}

// Add an admin to a restaurant
async function addRestaurantAdmin(req, res) {
  try {
    const { restaurantId } = req.params;
    const { email, role } = req.body;

    // Check if the user and restaurant exist
    const user = await User.findOne({ where: { email } });
    const restaurant = await Restaurant.findByPk(restaurantId);

    if (!user) {
      return res.status(404).json({ error: 'user_not_found' });
    }

    if (!restaurant) {
      return res.status(404).json({ error: 'restaurant_not_found' });
    }

    // Check if the user is already an admin for this restaurant
    const existingAdmin = await UserAdmin.findOne({
      where: { userId: user.id, restaurantId },
    });

    if (existingAdmin) {
      if (existingAdmin.role === role) {
        return res.status(400).json({ error: 'user_already_has_this_role' });
      } else {
        // Remove the existing admin with a different role
        await existingAdmin.destroy();
      }
    }

    // Add the admin with the new role
    const admin = await UserAdmin.create({
      userId: user.id,
      restaurantId,
      role,
    });
    res.status(201).json(admin);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while adding the admin' });
  }
}

// Remove an admin from a restaurant
async function removeRestaurantAdmin(req, res) {
  try {
    const { restaurantId, userId } = req.params;
    const admin = await UserAdmin.findOne({
      where: { restaurantId, userId },
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    await admin.destroy();
    res.status(204).send();
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while removing the admin' });
  }
}

// Get the user's admin role
async function getUserRole(req, res) {
  try {
    const userId = req.user.id;
    const restaurantId = req.params.restaurantId;
    const admin = await UserAdmin.findOne({
      where: { userId, restaurantId },
      attributes: ['role'],
    });

    if (!admin) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const role = admin.role;

    res.json({ role });
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while fetching the user role' });
  }
}

module.exports = {
  adminLogin,
  getAdminRestaurants,
  getRestaurantAdmins,
  addRestaurantAdmin,
  removeRestaurantAdmin,
  getUserRole,
};
