const { User, UserFollow, Experience, UserPoints, Notification } = require('../../models');
const { Op } = require('sequelize');
const { sequelize } = require('../../models');
const { createAndSendNotification } = require('../../utils/pushNotificationService');

/**
 * Follow a user
 * POST /api/v1/users/:userId/follow
 */
const followUser = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const currentUserId = req.user.id;
    const targetUserId = req.params.userId;

    // Validation: Cannot follow yourself
    if (currentUserId === targetUserId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FOLLOW_SELF',
          message: 'Cannot follow yourself',
        },
      });
    }

    // Check if target user exists
    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Check if already following
    const existingFollow = await UserFollow.findOne({
      where: {
        followerId: currentUserId,
        followingId: targetUserId,
      },
    });

    if (existingFollow) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_FOLLOWING',
          message: 'You are already following this user',
        },
      });
    }

    // Create follow relationship
    const follow = await UserFollow.create(
      {
        followerId: currentUserId,
        followingId: targetUserId,
        status: 'ACTIVE',
      },
      { transaction },
    );

    // Check if they are now buddies (mutual following)
    const reverseFollow = await UserFollow.findOne({
      where: {
        followerId: targetUserId,
        followingId: currentUserId,
        status: 'ACTIVE',
      },
    });

    const isBuddy = !!reverseFollow;

    await transaction.commit();

    // Pošalji notifikaciju korisniku kojeg si zapratio (kao na Instagramu)
    try {
      const followerUser = await User.findByPk(currentUserId, {
        attributes: ['username', 'name'],
      });

      await createAndSendNotification(targetUserId, {
        type: 'user_followed_you',
        title: 'Novi follower! 👤',
        body: `${followerUser.username} te je zapratio!`,
        actorUserId: currentUserId,
        data: {
          type: 'user_followed_you',
          actorUserId: currentUserId,
          followerUsername: followerUser.username,
          followerName: followerUser.name,
        },
      });

      console.log(
        `[Notification] Created follow notification for user ${targetUserId} from ${currentUserId}`,
      );
    } catch (notifError) {
      console.error(
        'Error sending follow notification:',
        notifError,
      );
      // Ne prekida flow ako notifikacija ne uspije
    }

    return res.status(201).json({
      success: true,
      message: isBuddy ? 'You are now buddies!' : 'Successfully followed user',
      data: {
        followId: follow.id,
        followerId: follow.followerId,
        followingId: follow.followingId,
        isBuddy,
        createdAt: follow.createdAt,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error following user:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to follow user',
      },
    });
  }
};

/**
 * Unfollow a user
 * DELETE /api/v1/users/:userId/follow
 */
const unfollowUser = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const targetUserId = req.params.userId;

    // Check if target user exists
    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Find the follow relationship
    const follow = await UserFollow.findOne({
      where: {
        followerId: currentUserId,
        followingId: targetUserId,
      },
    });

    if (!follow) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NOT_FOLLOWING',
          message: 'You are not following this user',
        },
      });
    }

    // Check if they were buddies
    const reverseFollow = await UserFollow.findOne({
      where: {
        followerId: targetUserId,
        followingId: currentUserId,
        status: 'ACTIVE',
      },
    });

    const wasBuddy = !!reverseFollow;

    // Delete the follow relationship
    await follow.destroy();

    // Obriši notifikaciju o followanju (Instagram behavior)
    try {
      await Notification.destroy({
        where: {
          userId: targetUserId,
          actorUserId: currentUserId,
          type: 'user_followed_you',
        },
      });
      console.log(
        `[Notification] Deleted follow notification for user ${targetUserId} from ${currentUserId}`,
      );
    } catch (notifError) {
      console.error('Error deleting follow notification:', notifError);
      // Ne prekida flow ako brisanje notifikacije ne uspije
    }

    return res.status(200).json({
      success: true,
      message: 'Successfully unfollowed user',
      data: {
        unfollowedUserId: targetUserId,
        wasBuddy,
      },
    });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to unfollow user',
      },
    });
  }
};

/**
 * Get user's followers
 * GET /api/v1/users/:userId/followers
 */
const getFollowers = async (req, res) => {
  try {
    const targetUserId =
      req.params.userId === 'me' ? req.user.id : req.params.userId;
    const currentUserId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    // Check if target user exists
    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Build search condition
    const searchCondition = search
      ? {
          [Op.or]: [
            { name: { [Op.iLike]: `%${search}%` } },
            { username: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : {};

    // Get followers
    const { count, rows: followers } = await UserFollow.findAndCountAll({
      where: {
        followingId: targetUserId,
        status: 'ACTIVE',
      },
      include: [
        {
          model: User,
          as: 'follower',
          attributes: [
            'id',
            'name',
            'username',
            'gender',
            'bio',
            'instagramUrl',
            'tiktokUrl',
            'profileImage',
            'city',
          ],
          where: searchCondition,
        },
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    // Get follow status for each follower
    const followersWithStatus = await Promise.all(
      followers.map(async (follow) => {
        const followStatus = await UserFollow.getFollowStatus(
          currentUserId,
          follow.follower.id,
        );

        return {
          id: follow.follower.id,
          name: follow.follower.name,
          username: follow.follower.username,
          gender: follow.follower.gender,
          bio: follow.follower.bio,
          instagramUrl: follow.follower.instagramUrl,
          tiktokUrl: follow.follower.tiktokUrl,
          profileImage: follow.follower.profileImage,
          city: follow.follower.city,
          isBuddy: followStatus.isBuddy,
          followedAt: follow.createdAt,
          isFollowingBack: followStatus.isFollowing,
        };
      }),
    );

    // Count buddies
    const buddiesCount = followersWithStatus.filter((f) => f.isBuddy).length;

    const totalPages = Math.ceil(count / limit);

    return res.status(200).json({
      success: true,
      data: {
        followers: followersWithStatus,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: count,
          itemsPerPage: limit,
        },
        summary: {
          totalFollowers: count,
          totalBuddies: buddiesCount,
        },
      },
    });
  } catch (error) {
    console.error('Error getting followers:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get followers',
      },
    });
  }
};

/**
 * Get users that the user is following
 * GET /api/v1/users/:userId/following
 */
const getFollowing = async (req, res) => {
  try {
    const targetUserId =
      req.params.userId === 'me' ? req.user.id : req.params.userId;
    const currentUserId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    // Check if target user exists
    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Build search condition
    const searchCondition = search
      ? {
          [Op.or]: [
            { name: { [Op.iLike]: `%${search}%` } },
            { username: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : {};

    // Get following
    const { count, rows: following } = await UserFollow.findAndCountAll({
      where: {
        followerId: targetUserId,
        status: 'ACTIVE',
      },
      include: [
        {
          model: User,
          as: 'following',
          attributes: [
            'id',
            'name',
            'username',
            'gender',
            'bio',
            'instagramUrl',
            'tiktokUrl',
            'profileImage',
            'city',
          ],
          where: searchCondition,
        },
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    // Get follow status for each followed user
    const followingWithStatus = await Promise.all(
      following.map(async (follow) => {
        const followStatus = await UserFollow.getFollowStatus(
          currentUserId,
          follow.following.id,
        );

        return {
          id: follow.following.id,
          name: follow.following.name,
          username: follow.following.username,
          gender: follow.following.gender,
          bio: follow.following.bio,
          instagramUrl: follow.following.instagramUrl,
          tiktokUrl: follow.following.tiktokUrl,
          profileImage: follow.following.profileImage,
          city: follow.following.city,
          isBuddy: followStatus.isBuddy,
          followedAt: follow.createdAt,
          isFollowingBack: followStatus.isFollowedBy,
        };
      }),
    );

    // Count buddies
    const buddiesCount = followingWithStatus.filter((f) => f.isBuddy).length;

    const totalPages = Math.ceil(count / limit);

    return res.status(200).json({
      success: true,
      data: {
        following: followingWithStatus,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: count,
          itemsPerPage: limit,
        },
        summary: {
          totalFollowing: count,
          totalBuddies: buddiesCount,
        },
      },
    });
  } catch (error) {
    console.error('Error getting following:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get following',
      },
    });
  }
};

/**
 * Get user's buddies (mutual followers)
 * GET /api/v1/users/:userId/buddies
 */
const getBuddies = async (req, res) => {
  try {
    const targetUserId =
      req.params.userId === 'me' ? req.user.id : req.params.userId;
    const currentUserId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    // Check if target user exists
    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Build search condition
    const searchCondition = search
      ? {
          [Op.or]: [
            { name: { [Op.iLike]: `%${search}%` } },
            { username: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : {};

    // Get buddies using a subquery to find mutual follows
    const buddiesQuery = `
      SELECT
        f1."followingId" as user_id,
        GREATEST(f1."createdAt", f2."createdAt") as buddies_since
      FROM "UserFollows" f1
      INNER JOIN "UserFollows" f2
        ON f1."followerId" = f2."followingId"
        AND f1."followingId" = f2."followerId"
      WHERE f1."followerId" = :targetUserId
        AND f1.status = 'ACTIVE'
        AND f2.status = 'ACTIVE'
      ORDER BY buddies_since DESC
      LIMIT :limit OFFSET :offset
    `;

    const buddiesCountQuery = `
      SELECT COUNT(*) as count
      FROM "UserFollows" f1
      INNER JOIN "UserFollows" f2
        ON f1."followerId" = f2."followingId"
        AND f1."followingId" = f2."followerId"
      WHERE f1."followerId" = :targetUserId
        AND f1.status = 'ACTIVE'
        AND f2.status = 'ACTIVE'
    `;

    const [buddyIds, countResult] = await Promise.all([
      sequelize.query(buddiesQuery, {
        replacements: { targetUserId, limit, offset },
        type: sequelize.QueryTypes.SELECT,
      }),
      sequelize.query(buddiesCountQuery, {
        replacements: { targetUserId },
        type: sequelize.QueryTypes.SELECT,
      }),
    ]);

    const count = parseInt(countResult[0].count);

    if (buddyIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          buddies: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: limit,
          },
        },
      });
    }

    // Get user details for buddies
    const buddies = await User.findAll({
      where: {
        id: { [Op.in]: buddyIds.map((b) => b.user_id) },
        ...searchCondition,
      },
      attributes: [
        'id',
        'name',
        'username',
        'gender',
        'bio',
        'instagramUrl',
        'tiktokUrl',
        'profileImage',
        'city',
      ],
    });

    // Map buddies with additional info
    const buddiesWithInfo = buddies.map((buddy) => {
      const buddyData = buddyIds.find((b) => b.user_id === buddy.id);
      return {
        id: buddy.id,
        name: buddy.name,
        username: buddy.username,
        gender: buddy.gender,
        bio: buddy.bio,
        instagramUrl: buddy.instagramUrl,
        tiktokUrl: buddy.tiktokUrl,
        profileImage: buddy.profileImage,
        city: buddy.city,
        buddiesSince: buddyData.buddies_since,
        mutualBuddiesCount: 0, // TODO: Calculate mutual buddies in future
      };
    });

    const totalPages = Math.ceil(count / limit);

    return res.status(200).json({
      success: true,
      data: {
        buddies: buddiesWithInfo,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: count,
          itemsPerPage: limit,
        },
      },
    });
  } catch (error) {
    console.error('Error getting buddies:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get buddies',
      },
    });
  }
};

/**
 * Check follow status between current user and target user
 * GET /api/v1/users/:userId/follow-status
 */
const getFollowStatus = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const targetUserId = req.params.userId;

    // Check if target user exists
    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    const followStatus = await UserFollow.getFollowStatus(
      currentUserId,
      targetUserId,
    );

    return res.status(200).json({
      success: true,
      data: {
        userId: targetUserId,
        ...followStatus,
      },
    });
  } catch (error) {
    console.error('Error getting follow status:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get follow status',
      },
    });
  }
};

/**
 * Search users to follow
 * GET /api/v1/users/search
 */
const searchUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const query = req.query.q || '';
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;
    const excludeFollowing = req.query.excludeFollowing === 'true';

    if (query.length < 1) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUERY',
          message: 'Search query must be at least 1 character',
        },
      });
    }

    // Build where condition
    const whereCondition = {
      id: { [Op.ne]: currentUserId }, // Exclude current user
      [Op.or]: [
        { name: { [Op.iLike]: `%${query}%` } },
        { username: { [Op.iLike]: `%${query}%` } },
      ],
    };

    // If excludeFollowing is true, exclude users already following
    let excludeIds = [];
    if (excludeFollowing) {
      const following = await UserFollow.findAll({
        where: {
          followerId: currentUserId,
          status: 'ACTIVE',
        },
        attributes: ['followingId'],
      });
      excludeIds = following.map((f) => f.followingId);

      if (excludeIds.length > 0) {
        whereCondition.id = {
          [Op.and]: [{ [Op.ne]: currentUserId }, { [Op.notIn]: excludeIds }],
        };
      }
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereCondition,
      attributes: [
        'id',
        'name',
        'username',
        'gender',
        'bio',
        'instagramUrl',
        'tiktokUrl',
        'profileImage',
        'city',
      ],
      limit,
      offset,
    });

    // Get follow status and experience count for each user
    const usersWithInfo = await Promise.all(
      users.map(async (user) => {
        const [followStatus, experienceCount] = await Promise.all([
          UserFollow.getFollowStatus(currentUserId, user.id),
          Experience.count({ where: { userId: user.id, status: 'APPROVED' } }),
        ]);

        return {
          id: user.id,
          name: user.name,
          username: user.username,
          gender: user.gender,
          bio: user.bio,
          instagramUrl: user.instagramUrl,
          tiktokUrl: user.tiktokUrl,
          profileImage: user.profileImage,
          city: user.city,
          followStatus: {
            isFollowing: followStatus.isFollowing,
            isFollowedBy: followStatus.isFollowedBy,
            isBuddy: followStatus.isBuddy,
          },
          stats: {
            totalExperiences: experienceCount,
          },
        };
      }),
    );

    const totalPages = Math.ceil(count / limit);

    return res.status(200).json({
      success: true,
      data: {
        users: usersWithInfo,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: count,
          itemsPerPage: limit,
        },
      },
    });
  } catch (error) {
    console.error('Error searching users:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to search users',
      },
    });
  }
};

/**
 * Get user profile with follow stats
 * GET /api/v1/users/:userId/profile
 */
const getUserProfileWithStats = async (req, res) => {
  try {
    const targetUserId =
      req.params.userId === 'me' ? req.user.id : req.params.userId;
    const currentUserId = req.user.id;

    // Get user with points
    const user = await User.findByPk(targetUserId, {
      attributes: [
        'id',
        'name',
        'username',
        'gender',
        'bio',
        'instagramUrl',
        'tiktokUrl',
        'profileImage',
        'city',
        'country',
        'createdAt',
      ],
      include: [
        {
          model: UserPoints,
          as: 'points',
          attributes: ['totalPoints', 'level', 'levelName'],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Get follow counts
    const [followersCount, followingCount, experienceCount] = await Promise.all(
      [
        UserFollow.count({
          where: { followingId: targetUserId, status: 'ACTIVE' },
        }),
        UserFollow.count({
          where: { followerId: targetUserId, status: 'ACTIVE' },
        }),
        Experience.count({
          where: { userId: targetUserId, status: 'APPROVED' },
        }),
      ],
    );

    // Calculate buddies count (mutual follows)
    const buddiesCountQuery = `
      SELECT COUNT(*) as count
      FROM "UserFollows" f1
      INNER JOIN "UserFollows" f2
        ON f1."followerId" = f2."followingId"
        AND f1."followingId" = f2."followerId"
      WHERE f1."followerId" = :targetUserId
        AND f1.status = 'ACTIVE'
        AND f2.status = 'ACTIVE'
    `;

    const buddiesResult = await sequelize.query(buddiesCountQuery, {
      replacements: { targetUserId },
      type: sequelize.QueryTypes.SELECT,
    });

    const buddiesCount = parseInt(buddiesResult[0].count);

    // Get follow status if viewing another user's profile
    let followStatus = null;
    if (targetUserId !== currentUserId) {
      followStatus = await UserFollow.getFollowStatus(
        currentUserId,
        targetUserId,
      );
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        username: user.username,
        gender: user.gender,
        bio: user.bio,
        instagramUrl: user.instagramUrl,
        tiktokUrl: user.tiktokUrl,
        profileImage: user.profileImage,
        city: user.city,
        country: user.country,
        memberSince: user.createdAt,
        followStats: {
          followersCount,
          followingCount,
          buddiesCount,
        },
        experienceStats: {
          totalExperiences: experienceCount,
        },
        pointsStats: {
          totalPoints: user.points
            ? Math.round(parseFloat(user.points.totalPoints) * 10) / 10
            : 0,
          level: user.points ? user.points.level : 1,
          levelName: user.points ? user.points.levelName : 'Bronze',
        },
        followStatus: followStatus
          ? {
              isFollowing: followStatus.isFollowing,
              isFollowedBy: followStatus.isFollowedBy,
              isBuddy: followStatus.isBuddy,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Error getting user profile with stats:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get user profile',
      },
    });
  }
};

module.exports = {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getBuddies,
  getFollowStatus,
  searchUsers,
  getUserProfileWithStats,
};
