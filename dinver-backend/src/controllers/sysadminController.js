const {
  Organization,
  Restaurant,
  User,
  UserOrganization,
  UserSysadmin,
  UserAdmin,
  Review,
} = require('../../models');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { generateTokens } = require('../../utils/tokenUtils');

async function sysadminLogin(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if the user is a sysadmin
    const sysadmin = await UserSysadmin.findOne({
      where: { userId: user.id },
    });

    if (!sysadmin) {
      return res.status(403).json({ error: 'Access denied. Sysadmin only.' });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    res
      .status(200)
      .json({ message: 'Login successful', language: user.language });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred during login' });
  }
}

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

// List all sysadmins
async function listSysadmins(req, res) {
  try {
    const sysadmins = await UserSysadmin.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName'],
        },
      ],
    });
    res.json(sysadmins);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while fetching sysadmins' });
  }
}

// Add a user as a sysadmin
async function addSysadmin(req, res) {
  try {
    const { email } = req.body;

    // Check if the user exists
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if the user is already a sysadmin
    const existingSysadmin = await UserSysadmin.findOne({
      where: { userId: user.id },
    });
    if (existingSysadmin) {
      return res.status(400).json({ error: 'User is already a sysadmin' });
    }

    // Add the user to the UserSysadmin table
    const sysadmin = await UserSysadmin.create({ userId: user.id });
    res.status(201).json(sysadmin);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while adding the sysadmin' });
  }
}

// Remove a user from sysadmins
async function removeSysadmin(req, res) {
  try {
    const { email } = req.params;
    // Find the user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find the sysadmin record
    const sysadmin = await UserSysadmin.findOne({ where: { userId: user.id } });
    if (!sysadmin) {
      return res.status(404).json({ error: 'Sysadmin not found' });
    }

    // Remove the sysadmin record
    await sysadmin.destroy();
    res.status(204).send();
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while removing the sysadmin' });
  }
}

// List users with pagination
async function listUsers(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const { search } = req.query;

    const whereClause = search
      ? {
          [Op.or]: [
            { email: { [Op.iLike]: `%${search}%` } },
            { firstName: { [Op.iLike]: `%${search}%` } },
            { lastName: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : {};

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: [
        'id',
        'email',
        'firstName',
        'lastName',
        'role',
        'createdAt',
        'banned',
      ],
      limit,
      offset,
      order: [['createdAt', 'ASC']],
    });

    res.json({
      totalUsers: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      users,
    });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching users' });
  }
}

// Create a new user
async function createUser(req, res) {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if the user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const user = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'user',
    });

    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while creating the user' });
  }
}

// Delete a user by email
async function deleteUser(req, res) {
  try {
    const { email } = req.body;

    // Find the user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete the user
    await user.destroy();
    res.status(204).send(); // No content response
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while deleting the user' });
  }
}

// Ban or unban a user
async function setUserBanStatus(req, res) {
  try {
    const { email, banned } = req.body;

    // Find the user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update the banned status
    user.banned = banned;
    await user.save();

    res
      .status(200)
      .json({ message: `User ${banned ? 'banned' : 'unbanned'} successfully` });
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while updating the user ban status' });
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

// Update an admin's role in a restaurant
async function updateRestaurantAdminRole(req, res) {
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
      .json({ error: 'An error occurred while updating the admin role' });
  }
}

async function listAllUsers(req, res) {
  try {
    const users = await User.findAll({
      attributes: ['id', 'email', 'firstName', 'lastName'],
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ error: 'Failed to fetch all users' });
  }
}

async function getAllReviewsForClaimedRestaurants(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const sortOption = req.query.sort || 'date_desc';

    let order;
    switch (sortOption) {
      case 'date_asc':
        order = [['createdAt', 'ASC']];
        break;
      case 'rating_desc':
        order = [['rating', 'DESC']];
        break;
      case 'rating_asc':
        order = [['rating', 'ASC']];
        break;
      case 'date_desc':
      default:
        order = [['createdAt', 'DESC']];
        break;
    }

    const users = await User.findAll({
      attributes: ['id', 'firstName', 'lastName', 'email'],
    });
    const userMap = users.reduce((map, user) => {
      map[user.id] = user;
      return map;
    }, {});

    const claimedRestaurants = await Restaurant.findAll({
      where: {
        isClaimed: true,
        name: { [Op.iLike]: `%${search}%` },
      },
      attributes: ['id', 'name'],
    });

    const reviewsData = await Promise.all(
      claimedRestaurants.map(async (restaurant) => {
        const { count, rows: reviews } = await Review.findAndCountAll({
          where: {
            restaurant_id: restaurant.id,
          },
          attributes: [
            'id',
            'rating',
            'comment',
            'images',
            'user_id',
            'createdAt',
          ],
          limit,
          offset,
          order,
        });

        const reviewsWithUserDetails = reviews.map((review) => {
          const user = userMap[review.user_id] || {};
          return {
            ...review.toJSON(),
            userFirstName: user.firstName || 'Unknown',
            userLastName: user.lastName || 'Unknown',
            userEmail: user.email || 'Unknown',
          };
        });

        return {
          restaurant: restaurant.name,
          reviews: reviewsWithUserDetails,
          totalReviews: count,
        };
      }),
    );

    const totalReviews = reviewsData.reduce(
      (acc, data) => acc + data.totalReviews,
      0,
    );
    const totalPages = Math.ceil(totalReviews / limit);

    res.json({
      totalReviews,
      totalPages,
      currentPage: page,
      reviewsData,
    });
  } catch (error) {
    console.error('Error fetching reviews for claimed restaurants:', error);
    res
      .status(500)
      .json({ error: 'Failed to fetch reviews for claimed restaurants' });
  }
}

module.exports = {
  sysadminLogin,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  addUserToOrganization,
  removeUserFromOrganization,
  addRestaurantToOrganization,
  listSysadmins,
  addSysadmin,
  removeSysadmin,
  listUsers,
  createUser,
  deleteUser,
  setUserBanStatus,
  getRestaurantAdmins,
  addRestaurantAdmin,
  removeRestaurantAdmin,
  updateRestaurantAdminRole,
  listAllUsers,
  getAllReviewsForClaimedRestaurants,
};
