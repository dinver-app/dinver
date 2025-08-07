const express = require('express');
const multer = require('multer');
const {
  analyzeMenuImage,
  analyzeMultipleMenuImages,
  importEditedMenu,
} = require('../../controllers/menuImportController');
const {
  checkSysadmin,
  sysadminAuthenticateToken,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only specific image files
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error('Only JPEG, PNG, GIF, and WebP image files are allowed'),
        false,
      );
    }
  },
});

// Analyze menu from single image
router.post(
  '/:restaurantId/analyze-single',
  sysadminAuthenticateToken,
  checkSysadmin,
  upload.single('image'),
  analyzeMenuImage,
);

// Analyze menu from multiple images
router.post(
  '/:restaurantId/analyze-multiple',
  sysadminAuthenticateToken,
  checkSysadmin,
  upload.array('images', 10), // Max 10 images
  analyzeMultipleMenuImages,
);

// Import edited menu data to system
router.post(
  '/:restaurantId/import',
  sysadminAuthenticateToken,
  checkSysadmin,
  importEditedMenu,
);

module.exports = router;
