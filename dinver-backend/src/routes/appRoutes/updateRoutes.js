/**
 * Restaurant Update Routes (Public)
 *
 * Routes for viewing restaurant updates in the feed.
 * Updates are short-lived announcements from restaurant owners
 * (e.g., live music, special offers, events).
 */

const express = require('express');
const router = express.Router();
const updateController = require('../../controllers/restaurantUpdateController');
const {
  appApiKeyAuth,
  appOptionalAuth,
} = require('../../middleware/roleMiddleware');

// ============================================================
// FEED
// ============================================================

/**
 * Get Updates Feed (public)
 * Returns active, non-expired updates sorted by newest first
 *
 * Query params:
 * - lat, lng: User location for distance filtering
 * - distance: 10, 20, 50, or "all" km (default: 20)
 * - category: Filter by category (optional)
 * - limit, offset: Pagination
 *
 * GET /api/app/updates/feed?lat=45.815&lng=15.982&distance=20&category=LIVE_MUSIC&limit=20&offset=0
 */
router.get('/feed', appApiKeyAuth, appOptionalAuth, updateController.getUpdatesFeed);

// ============================================================
// RESTAURANT SPECIFIC
// ============================================================

/**
 * Get active updates for a specific restaurant
 * Used on restaurant details page to show current announcements
 *
 * GET /api/app/updates/restaurant/:restaurantId?limit=10
 */
router.get(
  '/restaurant/:restaurantId',
  appApiKeyAuth,
  appOptionalAuth,
  updateController.getActiveUpdatesByRestaurant
);

// ============================================================
// CATEGORIES
// ============================================================

/**
 * Get all available categories
 * Useful for building filter UI
 *
 * GET /api/app/updates/categories
 */
router.get('/categories', appApiKeyAuth, updateController.getCategories);

// ============================================================
// SINGLE UPDATE
// ============================================================

/**
 * Get Update by ID
 * GET /api/app/updates/:updateId
 */
router.get('/:updateId', appApiKeyAuth, appOptionalAuth, updateController.getUpdateById);

/**
 * Record a view on an update
 * POST /api/app/updates/:updateId/view
 */
router.post(
  '/:updateId/view',
  appApiKeyAuth,
  appOptionalAuth,
  updateController.recordView
);

module.exports = router;
