const { Restaurant, UserAdmin, User } = require('../../models');
const bcrypt = require('bcrypt');
const { generateTokens } = require('../../utils/tokenUtils');
const { RestaurantPost, PostView, PostInteraction } = require('../../models');

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

    res.cookie('adminRefreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
    });
    res.cookie('adminAccessToken', accessToken, {
      httpOnly: true,
      secure: true,
    });

    res.status(200).json({ message: 'Login successful', user: user });
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

// Get statistics for a specific post
const getPostStats = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await RestaurantPost.findByPk(postId, {
      include: [
        {
          model: PostView,
          as: 'views',
          attributes: ['watchTime', 'completionRate', 'timeOfDay', 'createdAt'],
        },
        {
          model: PostInteraction,
          as: 'interactions',
          attributes: ['interactionType', 'createdAt'],
        },
      ],
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Calculate hourly view distribution
    const hourlyViews = Array(24).fill(0);
    post.views.forEach((view) => {
      hourlyViews[view.timeOfDay]++;
    });

    // Calculate interaction counts
    const interactions = {
      likes: 0,
      saves: 0,
      shares: 0,
    };
    post.interactions.forEach((interaction) => {
      if (interaction.interactionType in interactions) {
        interactions[interaction.interactionType]++;
      }
    });

    // Calculate average watch time and completion rate
    const avgWatchTime =
      post.views.reduce((sum, view) => sum + view.watchTime, 0) /
      (post.views.length || 1);
    const avgCompletionRate =
      post.views.reduce((sum, view) => sum + view.completionRate, 0) /
      (post.views.length || 1);

    // Get view trends (last 7 days)
    const last7Days = Array(7).fill(0);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    post.views.forEach((view) => {
      const dayIndex = Math.floor(
        (today - view.createdAt) / (1000 * 60 * 60 * 24),
      );
      if (dayIndex >= 0 && dayIndex < 7) {
        last7Days[dayIndex]++;
      }
    });

    res.json({
      postId: post.id,
      title: post.title,
      metrics: {
        totalViews: post.viewCount,
        ...interactions,
        avgWatchTime,
        avgCompletionRate: avgCompletionRate * 100, // Convert to percentage
        engagementScore: post.engagementScore,
      },
      hourlyDistribution: hourlyViews,
      last7DaysViews: last7Days.reverse(), // Reverse so most recent day is last
      peakHours: post.peakHours || {},
    });
  } catch (error) {
    console.error('Error fetching post statistics:', error);
    res.status(500).json({ error: 'Failed to fetch post statistics' });
  }
};

// Get aggregated statistics for all posts of a restaurant
const getRestaurantPostStats = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const posts = await RestaurantPost.findAll({
      where: { restaurantId },
      include: [
        {
          model: PostView,
          as: 'views',
          attributes: ['watchTime', 'completionRate', 'timeOfDay'],
        },
        {
          model: PostInteraction,
          as: 'interactions',
          attributes: ['interactionType'],
        },
      ],
    });

    // Initialize aggregated metrics
    const aggregatedMetrics = {
      totalPosts: posts.length,
      totalViews: 0,
      totalLikes: 0,
      totalSaves: 0,
      totalShares: 0,
      avgWatchTime: 0,
      avgCompletionRate: 0,
      avgEngagementScore: 0,
      hourlyDistribution: Array(24).fill(0),
    };

    // Calculate totals
    posts.forEach((post) => {
      aggregatedMetrics.totalViews += post.viewCount;

      post.interactions.forEach((interaction) => {
        switch (interaction.interactionType) {
          case 'like':
            aggregatedMetrics.totalLikes++;
            break;
          case 'save':
            aggregatedMetrics.totalSaves++;
            break;
          case 'share':
            aggregatedMetrics.totalShares++;
            break;
        }
      });

      // Add to hourly distribution
      post.views.forEach((view) => {
        aggregatedMetrics.hourlyDistribution[view.timeOfDay]++;
      });

      // Add to averages
      const postAvgWatchTime =
        post.views.reduce((sum, view) => sum + view.watchTime, 0) /
        (post.views.length || 1);
      const postAvgCompletionRate =
        post.views.reduce((sum, view) => sum + view.completionRate, 0) /
        (post.views.length || 1);

      aggregatedMetrics.avgWatchTime += postAvgWatchTime;
      aggregatedMetrics.avgCompletionRate += postAvgCompletionRate;
      aggregatedMetrics.avgEngagementScore += post.engagementScore || 0;
    });

    // Calculate final averages
    if (posts.length > 0) {
      aggregatedMetrics.avgWatchTime /= posts.length;
      aggregatedMetrics.avgCompletionRate =
        (aggregatedMetrics.avgCompletionRate / posts.length) * 100; // Convert to percentage
      aggregatedMetrics.avgEngagementScore /= posts.length;
    }

    // Find peak posting hours
    const peakHour = aggregatedMetrics.hourlyDistribution.reduce(
      (maxHour, views, hour) => {
        return views > aggregatedMetrics.hourlyDistribution[maxHour]
          ? hour
          : maxHour;
      },
      0,
    );

    res.json({
      ...aggregatedMetrics,
      peakHour,
      averageInteractionsPerPost: {
        likes: aggregatedMetrics.totalLikes / posts.length || 0,
        saves: aggregatedMetrics.totalSaves / posts.length || 0,
        shares: aggregatedMetrics.totalShares / posts.length || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching restaurant post statistics:', error);
    res
      .status(500)
      .json({ error: 'Failed to fetch restaurant post statistics' });
  }
};

module.exports = {
  adminLogin,
  getAdminRestaurants,
  getRestaurantAdmins,
  addRestaurantAdmin,
  removeRestaurantAdmin,
  getUserRole,
  updateRestaurantAdmin,
  getPostStats,
  getRestaurantPostStats,
};
