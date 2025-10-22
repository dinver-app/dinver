const express = require('express');
const multer = require('multer');
const {
  sysadminAuthenticateToken,
} = require('../../middleware/roleMiddleware');
const leaderboardCycleController = require('../../controllers/leaderboardCycleController');

const router = express.Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// Create a new leaderboard cycle (with optional image upload)
router.post(
  '/leaderboard-cycles',
  sysadminAuthenticateToken,
  upload.single('headerImage'),
  leaderboardCycleController.createCycle,
);

// Get all cycles with filters
router.get(
  '/leaderboard-cycles',
  sysadminAuthenticateToken,
  leaderboardCycleController.getAllCycles,
);

// Get single cycle by ID with detailed information
router.get(
  '/leaderboard-cycles/:id',
  sysadminAuthenticateToken,
  leaderboardCycleController.getCycleById,
);

// Update cycle details (only if scheduled/active)
router.put(
  '/leaderboard-cycles/:id',
  sysadminAuthenticateToken,
  leaderboardCycleController.updateCycle,
);

// Cancel a cycle
router.delete(
  '/leaderboard-cycles/:id',
  sysadminAuthenticateToken,
  leaderboardCycleController.cancelCycle,
);

// Manually complete a cycle and select winners
router.post(
  '/leaderboard-cycles/:id/complete',
  sysadminAuthenticateToken,
  leaderboardCycleController.manuallyCompleteCycle,
);

// Get cycle participants with rankings
router.get(
  '/leaderboard-cycles/:id/participants',
  sysadminAuthenticateToken,
  leaderboardCycleController.getCycleParticipants,
);

// Get cycle winners
router.get(
  '/leaderboard-cycles/:id/winners',
  sysadminAuthenticateToken,
  leaderboardCycleController.getCycleWinners,
);

module.exports = router;
