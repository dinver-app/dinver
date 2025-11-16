const { UserFollow } = require('../models');
const { Op } = require('sequelize');

/**
 * Build WHERE conditions for Experience queries based on visibility and user relationship
 * @param {string} currentUserId - ID of the current user viewing experiences
 * @param {string|null} authorId - Optional: Filter experiences by specific author
 * @returns {Promise<Object>} - Sequelize WHERE conditions
 */
async function buildVisibilityWhereConditions(currentUserId, authorId = null) {
  if (!currentUserId) {
    // Anonymous users can only see 'ALL' visibility experiences
    return {
      visibility: 'ALL',
      status: 'APPROVED',
      ...(authorId && { userId: authorId }),
    };
  }

  // Get users that current user follows
  const following = await UserFollow.findAll({
    where: {
      followerId: currentUserId,
      status: 'ACTIVE',
    },
    attributes: ['followingId'],
  });

  const followingIds = following.map((f) => f.followingId);

  // Get users that follow current user (to determine buddies)
  const followers = await UserFollow.findAll({
    where: {
      followingId: currentUserId,
      status: 'ACTIVE',
    },
    attributes: ['followerId'],
  });

  const followerIds = followers.map((f) => f.followerId);

  // Buddies are users in both lists (mutual following)
  const buddyIds = followingIds.filter((id) => followerIds.includes(id));

  // Build visibility conditions
  const visibilityConditions = [
    // Always show 'ALL' visibility experiences
    { visibility: 'ALL' },

    // Show 'FOLLOWERS' if current user follows the author
    {
      visibility: 'FOLLOWERS',
      userId: { [Op.in]: followingIds },
    },

    // Show 'BUDDIES' only if they are buddies
    {
      visibility: 'BUDDIES',
      userId: { [Op.in]: buddyIds },
    },

    // Always show user's own experiences
    {
      userId: currentUserId,
    },
  ];

  return {
    [Op.and]: [
      {
        [Op.or]: visibilityConditions,
      },
      {
        status: 'APPROVED', // Only show approved experiences
      },
      ...(authorId && { userId: authorId } ? [{ userId: authorId }] : []),
    ],
  };
}

/**
 * Check if a user can view a specific experience
 * @param {Object} experience - Experience object
 * @param {string} currentUserId - ID of the current user
 * @returns {Promise<boolean>} - Whether user can view the experience
 */
async function canViewExperience(experience, currentUserId) {
  // Experience must be approved
  if (experience.status !== 'APPROVED') {
    // Only author can view non-approved experiences
    return experience.userId === currentUserId;
  }

  // User can always view their own experiences
  if (experience.userId === currentUserId) {
    return true;
  }

  // Check visibility level
  switch (experience.visibility) {
    case 'ALL':
      return true;

    case 'FOLLOWERS': {
      // Check if current user follows the author
      const isFollowing = await UserFollow.findOne({
        where: {
          followerId: currentUserId,
          followingId: experience.userId,
          status: 'ACTIVE',
        },
      });
      return !!isFollowing;
    }

    case 'BUDDIES': {
      // Check if they are buddies (mutual following)
      const isBuddy = await UserFollow.areBuddies(
        currentUserId,
        experience.userId,
      );
      return isBuddy;
    }

    default:
      return false;
  }
}

/**
 * Get visibility statistics for a user's experiences
 * @param {string} userId - ID of the user
 * @returns {Promise<Object>} - Statistics about experience visibility
 */
async function getVisibilityStats(userId) {
  const { Experience } = require('../models');

  const [allCount, followersCount, buddiesCount] = await Promise.all([
    Experience.count({
      where: { userId, visibility: 'ALL', status: 'APPROVED' },
    }),
    Experience.count({
      where: { userId, visibility: 'FOLLOWERS', status: 'APPROVED' },
    }),
    Experience.count({
      where: { userId, visibility: 'BUDDIES', status: 'APPROVED' },
    }),
  ]);

  return {
    all: allCount,
    followers: followersCount,
    buddies: buddiesCount,
    total: allCount + followersCount + buddiesCount,
  };
}

/**
 * Validate visibility value
 * @param {string} visibility - Visibility value to validate
 * @returns {boolean} - Whether visibility is valid
 */
function isValidVisibility(visibility) {
  return ['ALL', 'FOLLOWERS', 'BUDDIES'].includes(visibility);
}

module.exports = {
  buildVisibilityWhereConditions,
  canViewExperience,
  getVisibilityStats,
  isValidVisibility,
};
