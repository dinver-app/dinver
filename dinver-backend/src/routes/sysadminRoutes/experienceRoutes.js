const express = require('express');
const experienceController = require('../../controllers/sysadminExperienceController');
const {
  sysadminAuthenticateToken,
  checkSysadmin,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

// Experience statistics
router.get(
  '/experiences/stats',
  sysadminAuthenticateToken,
  checkSysadmin,
  experienceController.getExperienceStats,
);

// Experience CRUD
router.get(
  '/experiences',
  sysadminAuthenticateToken,
  checkSysadmin,
  experienceController.getAllExperiences,
);

router.get(
  '/experiences/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  experienceController.getExperienceById,
);

router.delete(
  '/experiences/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  experienceController.deleteExperience,
);

router.put(
  '/experiences/:id/status',
  sysadminAuthenticateToken,
  checkSysadmin,
  experienceController.updateExperienceStatus,
);

module.exports = router;
