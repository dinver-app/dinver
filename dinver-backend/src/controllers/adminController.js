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
      where: { userId: user.id, role: 'admin' },
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

module.exports = {
  adminLogin,
  getAdminRestaurants,
};
