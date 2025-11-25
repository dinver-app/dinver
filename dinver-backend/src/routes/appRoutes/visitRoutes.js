const express = require('express');
const multer = require('multer');
const visitController = require('../../controllers/visitController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
  appOptionalAuth,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

// Configure multer for memory storage (files will be uploaded to S3)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for receipt images
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// Get user's visited list
router.get(
  '/visits',
  appApiKeyAuth,
  appAuthenticateToken,
  visitController.getUserVisits,
);

// Upload receipt + Create Visit in ONE call
// Body (multipart/form-data): receiptImage, taggedBuddies?, locationLat?, locationLng?, gpsAccuracy?
router.post(
  '/visits/upload-receipt',
  (req, res, next) => {
    req._uploadStartTime = Date.now();
    console.log(`[UPLOAD TIMING] >>> Request received at router`);
    next();
  },
  appApiKeyAuth,
  (req, res, next) => {
    console.log(`[UPLOAD TIMING] >>> After appApiKeyAuth: ${Date.now() - req._uploadStartTime}ms`);
    next();
  },
  appAuthenticateToken,
  (req, res, next) => {
    console.log(`[UPLOAD TIMING] >>> After appAuthenticateToken: ${Date.now() - req._uploadStartTime}ms`);
    next();
  },
  upload.single('receiptImage'),
  (req, res, next) => {
    console.log(`[UPLOAD TIMING] >>> After multer upload: ${Date.now() - req._uploadStartTime}ms (file: ${req.file?.size ? Math.round(req.file.size / 1024) + 'KB' : 'none'})`);
    next();
  },
  visitController.uploadReceiptAndCreateVisit,
);

// Get single visit details
router.get(
  '/visits/:visitId',
  appApiKeyAuth,
  appAuthenticateToken,
  visitController.getVisitById,
);

// Retake receipt photo (for rejected visits)
router.put(
  '/visits/:visitId/retake',
  appApiKeyAuth,
  appAuthenticateToken,
  upload.single('receiptImage'),
  visitController.retakeReceipt,
);

// Check if user has visited a restaurant
router.get(
  '/visits/restaurant/:restaurantId/check',
  appApiKeyAuth,
  appAuthenticateToken,
  visitController.checkHasVisited,
);

// Get all user's visits for a specific restaurant
router.get(
  '/visits/restaurant/:restaurantId',
  appApiKeyAuth,
  appAuthenticateToken,
  visitController.getVisitsByRestaurant,
);

// Delete visit (user can delete within 14 days)
router.delete(
  '/visits/:visitId',
  appApiKeyAuth,
  appAuthenticateToken,
  visitController.deleteVisit,
);

// Get user's buddies (for tagging in visits)
router.get(
  '/users/buddies',
  appApiKeyAuth,
  appAuthenticateToken,
  visitController.getUserBuddies,
);

// Get other user's visits (public viewing with optional auth for privacy check)
router.get(
  '/users/:userId/visits',
  appApiKeyAuth,
  appOptionalAuth,
  visitController.getOtherUserVisits,
);

module.exports = router;
