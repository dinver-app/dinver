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

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
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

// Get Experience Feed (public, chronological)
// GET /api/app/experiences/feed?city=Zagreb&mealType=dinner&limit=20&offset=0
router.get(
  '/feed',
  appApiKeyAuth,
  appOptionalAuth,
  experienceController.getExperienceFeed
);

// ============================================================
// USER EXPERIENCES
// ============================================================

// Get User's Experiences
// GET /api/app/experiences/user/:userId
router.get(
  '/user/:userId',
  appApiKeyAuth,
  appOptionalAuth,
  experienceController.getUserExperiences
);

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

// Create Experience (linked to Visit)
// POST /api/app/experiences
router.post(
  '/',
  appApiKeyAuth,
  appAuthenticateToken,
  experienceController.createExperience
);

// Update Experience (while in DRAFT)
// PUT /api/app/experiences/:experienceId
router.put(
  '/:experienceId',
  appApiKeyAuth,
  appAuthenticateToken,
  experienceController.updateExperience
);

// Publish Experience (DRAFT -> PENDING/APPROVED)
// POST /api/app/experiences/:experienceId/publish
router.post(
  '/:experienceId/publish',
  appApiKeyAuth,
  appAuthenticateToken,
  experienceController.publishExperience
);

// Get Experience by ID
// GET /api/app/experiences/:experienceId
router.get(
  '/:experienceId',
  appApiKeyAuth,
  appOptionalAuth,
  experienceController.getExperience
);

// ============================================================
// MEDIA UPLOAD
// ============================================================

// Upload image to Experience
// POST /api/app/experiences/:experienceId/media
router.post(
  '/:experienceId/media',
  appApiKeyAuth,
  appAuthenticateToken,
  upload.single('image'),
  experienceController.uploadExperienceMedia
);

// Delete image from Experience
// DELETE /api/app/experiences/:experienceId/media/:mediaId
router.delete(
  '/:experienceId/media/:mediaId',
  appApiKeyAuth,
  appAuthenticateToken,
  experienceController.deleteExperienceMedia
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
