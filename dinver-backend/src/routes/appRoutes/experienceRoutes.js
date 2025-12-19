/**
 * Experience Routes
 *
 * Routes for Experience creation, management, and feed.
 * Experiences are linked to Visits (verified restaurant visits).
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const experienceController = require('../../controllers/appExperienceController');
const {
  appAuthenticateToken,
  appOptionalAuth,
  appApiKeyAuth,
} = require('../../middleware/roleMiddleware');

// Configure multer for multiple image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max per file
    files: 6, // Max 6 files
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and HEIC are allowed.'));
    }
  },
});

// ============================================================
// FEED
// ============================================================

// Get Experience Feed (public, chronological, with distance filter)
// GET /api/app/experiences/feed?lat=45.815&lng=15.982&distance=20&mealType=dinner&onlyFollowing=true&limit=20&offset=0
router.get('/feed', appApiKeyAuth, appOptionalAuth, experienceController.getExperienceFeed);

// ============================================================
// USER EXPERIENCES
// ============================================================

// Get User's Experiences
// GET /api/app/experiences/user/:userId
router.get('/user/:userId', appApiKeyAuth, appOptionalAuth, experienceController.getUserExperiences);

// ============================================================
// RESTAURANT EXPERIENCES
// ============================================================

// Get Restaurant's Experiences (reviews)
// GET /api/app/experiences/restaurant/:restaurantId
router.get(
  '/restaurant/:restaurantId',
  appApiKeyAuth,
  appOptionalAuth,
  experienceController.getRestaurantExperiences
);

// ============================================================
// EXPERIENCE CRUD
// ============================================================

// Create Experience with images (all in one request)
// POST /api/app/experiences
// Multipart form data: visitId, foodRating, ambienceRating, serviceRating, description?, partySize?, mealType?, visibility?, images[], captions[]
router.post(
  '/',
  appApiKeyAuth,
  appAuthenticateToken,
  upload.array('images', 6),
  experienceController.createExperience
);

// Get Experience by ID
// GET /api/app/experiences/:experienceId
router.get('/:experienceId', appApiKeyAuth, appOptionalAuth, experienceController.getExperience);

// Delete Experience
// DELETE /api/app/experiences/:experienceId
router.delete(
  '/:experienceId',
  appApiKeyAuth,
  appAuthenticateToken,
  experienceController.deleteExperience
);

// ============================================================
// INTERACTIONS
// ============================================================

// Like Experience
// POST /api/app/experiences/:experienceId/like
router.post(
  '/:experienceId/like',
  appApiKeyAuth,
  appAuthenticateToken,
  experienceController.likeExperience
);

// Unlike Experience
// DELETE /api/app/experiences/:experienceId/like
router.delete(
  '/:experienceId/like',
  appApiKeyAuth,
  appAuthenticateToken,
  experienceController.unlikeExperience
);

// Share Experience (track share for stats)
// POST /api/app/experiences/:experienceId/share
router.post(
  '/:experienceId/share',
  appApiKeyAuth,
  appOptionalAuth,
  experienceController.shareExperience
);

module.exports = router;
