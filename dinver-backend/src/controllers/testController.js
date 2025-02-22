const { Restaurant, UserAdmin, User } = require('../../models');

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
      return res.status(400).json({ error: 'user_already_admin' });
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

// Update an admin's role for a restaurant
async function updateRestaurantAdmin(req, res) {
  try {
    const { restaurantId, userId } = req.params;
    const { role } = req.body;

    const admin = await UserAdmin.findOne({
      where: { restaurantId, userId },
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    admin.role = role;
    await admin.save();

    res.status(200).json(admin);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while updating the admin' });
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

module.exports = {
  addRestaurantAdmin,
  updateRestaurantAdmin,
  removeRestaurantAdmin,
};
