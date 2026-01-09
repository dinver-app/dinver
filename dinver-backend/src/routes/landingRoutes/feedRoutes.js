/**
 * Landing Page Feed Routes
 *
 * Public endpoints for landing page content.
 * Protected by landing API key.
 */

const express = require('express');
const router = express.Router();
const {
  getLandingExperiences,
  getLandingWhatsNew,
  getLandingStats,
  getExperienceById,
} = require('../../controllers/landingController');
const { landingApiKeyAuth } = require('../../middleware/roleMiddleware');

// All routes require landing API key
router.use(landingApiKeyAuth);

/**
 * GET /api/landing/experiences
 * Get featured experiences for landing page feed demo
 *
 * Query params:
 * - limit: number (default 10, max 20)
 * - mealType: string (breakfast, brunch, lunch, dinner, sweet, drinks)
 * - city: string
 */
router.get('/experiences', getLandingExperiences);

/**
 * GET /api/landing/whats-new
 * Get active restaurant updates for landing page
 *
 * Query params:
 * - limit: number (default 10, max 20)
 * - category: string (LIVE_MUSIC, NEW_PRODUCT, etc.)
 * - lang: string (en/hr, default hr)
 */
router.get('/whats-new', getLandingWhatsNew);

/**
 * GET /api/landing/stats
 * Get aggregate stats for landing page hero
 */
router.get('/stats', getLandingStats);

/**
 * GET /api/landing/experiences/:experienceId
 * Get single experience for shared experience page
 */
router.get('/experiences/:experienceId', getExperienceById);

module.exports = router;
