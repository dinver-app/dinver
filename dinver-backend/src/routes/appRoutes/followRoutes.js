const express = require('express');
const followController = require('../../controllers/followController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

/**
 * Follow System Routes
 * Base path: /api/app/users
 */

// Follow a user
router.post(
  '/users/:userId/follow',
  appApiKeyAuth,
  appAuthenticateToken,
  followController.followUser,
);

// Unfollow a user
router.delete(
  '/users/:userId/follow',
  appApiKeyAuth,
  appAuthenticateToken,
  followController.unfollowUser,
);

// Get user's followers
router.get(
  '/users/:userId/followers',
  appApiKeyAuth,
  appAuthenticateToken,
  followController.getFollowers,
);

// Get users that user is following
router.get(
  '/users/:userId/following',
  appApiKeyAuth,
  appAuthenticateToken,
  followController.getFollowing,
);

// Get user's buddies (mutual followers)
router.get(
  '/users/:userId/buddies',
  appApiKeyAuth,
  appAuthenticateToken,
  followController.getBuddies,
);

// Check follow status between current user and target user
router.get(
  '/users/:userId/follow-status',
  appApiKeyAuth,
  appAuthenticateToken,
  followController.getFollowStatus,
);

// Search users to follow
router.get(
  '/users/search',
  appApiKeyAuth,
  appAuthenticateToken,
  followController.searchUsers,
);

// Get user profile with follow stats
router.get(
  '/users/:userId/profile',
  appApiKeyAuth,
  appAuthenticateToken,
  followController.getUserProfileWithStats,
);

module.exports = router;
