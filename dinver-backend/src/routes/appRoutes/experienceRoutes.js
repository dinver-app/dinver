const express = require('express');
const router = express.Router();
const experienceController = require('../../controllers/experienceController');
const {
  appAuthenticateToken,
  appOptionalAuth,
} = require('../../middleware/roleMiddleware');

// Media upload endpoints
router.post(
  '/media/presign',
  appAuthenticateToken,
  experienceController.requestMediaPresignedUrl,
);

router.post(
  '/media/confirm',
  appAuthenticateToken,
  experienceController.confirmMediaUpload,
);

// NEW: Video processing status check
router.get(
  '/media/video-status/:jobId',
  appAuthenticateToken,
  experienceController.checkVideoStatus,
);

// Experience CRUD
router.post('/', appAuthenticateToken, experienceController.createExperience);

router.get(
  '/explore',
  appOptionalAuth,
  experienceController.getExploreFeed,
);

router.get('/:id', appOptionalAuth, experienceController.getExperience);

// Interactions
router.post('/:id/like', appAuthenticateToken, experienceController.likeExperience);
router.delete('/:id/like', appAuthenticateToken, experienceController.unlikeExperience);

router.post('/:id/save', appAuthenticateToken, experienceController.saveExperience);
router.delete('/:id/save', appAuthenticateToken, experienceController.unsaveExperience);

router.post('/:id/view', appOptionalAuth, experienceController.trackView);

// Report
const experienceModerationController = require('../../controllers/experienceModerationController');
router.post(
  '/:id/report',
  appAuthenticateToken,
  experienceModerationController.reportExperience,
);

// User-specific endpoints
router.get('/my-likes', appAuthenticateToken, experienceController.getMyLikes);
router.get('/my-map', appAuthenticateToken, experienceController.getMyMap);

module.exports = router;
