const express = require('express');
const multer = require('multer');
const visitController = require('../../controllers/visitController');
const {
  appApiKeyAuth,
  appAuthenticateToken,
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
  appApiKeyAuth,
  appAuthenticateToken,
  upload.single('receiptImage'),
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

module.exports = router;
