const express = require('express');
const router = express.Router();
const experienceController = require('../../controllers/experienceController');
const { appOptionalAuth } = require('../../middleware/roleMiddleware');

// Get experiences by user
router.get(
  '/:userId/experiences',
  appOptionalAuth,
  experienceController.getUserExperiences,
);

module.exports = router;
