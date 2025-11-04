const express = require('express');
const router = express.Router();
const experienceModerationController = require('../../controllers/experienceModerationController');
const { sysadminAuthenticateToken } = require('../../middleware/roleMiddleware');

// Sve rute zahtijevaju sysadmin autentifikaciju
router.use(sysadminAuthenticateToken);

// Moderation queue
router.get(
  '/experiences/moderation/queue',
  experienceModerationController.getModerationQueue,
);

router.get(
  '/experiences/moderation/stats',
  experienceModerationController.getModerationStats,
);

router.post(
  '/experiences/moderation/:id/assign',
  experienceModerationController.assignModerator,
);

router.post(
  '/experiences/moderation/:id/approve',
  experienceModerationController.approveExperience,
);

router.post(
  '/experiences/moderation/:id/reject',
  experienceModerationController.rejectExperience,
);

// Reports
router.get(
  '/experiences/reports',
  experienceModerationController.getReports,
);

router.post(
  '/experiences/reports/:id/review',
  experienceModerationController.reviewReport,
);

// Detaljni podaci o jednom experience-u (za praćenje)
router.get(
  '/experiences/:id/details',
  experienceModerationController.getExperienceDetails,
);

// Statistika po useru
router.get(
  '/experiences/users/:userId/stats',
  experienceModerationController.getUserExperienceStats,
);

module.exports = router;
