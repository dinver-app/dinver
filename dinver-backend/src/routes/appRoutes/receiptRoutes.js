const express = require('express');
const multer = require('multer');
const {
  appAuthenticateToken,
  appApiKeyAuth,
} = require('../../middleware/roleMiddleware');

const {
  uploadReceipt,
  searchRestaurants,
  searchRestaurantsSimple,
  getRestaurantDetails,
  getUserReceipts,
  getReceiptById,
} = require('../../controllers/appReceiptController');

const router = express.Router();

// Configure multer for image upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only specific image formats that OCR can process
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
    ];

    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];

    const isValidMimeType = allowedMimeTypes.includes(file.mimetype.toLowerCase());
    const hasValidExtension = allowedExtensions.some((ext) =>
      file.originalname.toLowerCase().endsWith(ext),
    );

    if (isValidMimeType || hasValidExtension) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Nepodržan format slike. Molimo koristite: JPG, PNG, WEBP ili HEIC. Vaš format: ${file.mimetype}`,
        ),
        false,
      );
    }
  },
});

// Error handler for multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'Slika je prevelika. Maksimalna veličina je 10MB.',
      });
    }
    return res.status(400).json({
      error: `Greška pri uploadu slike: ${err.message}`,
    });
  } else if (err) {
    // Custom errors from fileFilter
    return res.status(400).json({
      error: err.message,
    });
  }
  next();
};

// Upload receipt (with Claude OCR + Restaurant Matching)
router.post(
  '/receipts',
  appApiKeyAuth,
  appAuthenticateToken,
  upload.single('image'),
  handleMulterError,
  uploadReceipt,
);

// Get user's receipts (with optional filtering)
// GET /api/app/receipts?status=pending&withoutVisit=true
router.get(
  '/receipts',
  appApiKeyAuth,
  appAuthenticateToken,
  getUserReceipts,
);

// Get single receipt by ID
// GET /api/app/receipts/:id
router.get(
  '/receipts/:id',
  appApiKeyAuth,
  appAuthenticateToken,
  getReceiptById,
);

// NEW: Simple restaurant search (diacritic-insensitive, all restaurants)
// GET /api/app/restaurants/search?q=cingi
router.get(
  '/restaurants/search',
  appApiKeyAuth,
  appAuthenticateToken,
  searchRestaurantsSimple,
);

// LEGACY: Complex search with Google Places (kept for backward compatibility)
router.get(
  '/receipts/search-restaurants',
  appApiKeyAuth,
  appAuthenticateToken,
  searchRestaurants,
);

// Get restaurant details (for manual selection auto-creation)
router.get(
  '/receipts/restaurant-details/:placeId',
  appApiKeyAuth,
  appAuthenticateToken,
  getRestaurantDetails,
);

module.exports = router;
