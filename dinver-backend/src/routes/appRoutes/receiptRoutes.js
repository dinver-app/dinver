const express = require('express');
const multer = require('multer');
const {
  appAuthenticateToken,
  appApiKeyAuth,
} = require('../../middleware/roleMiddleware');

const {
  uploadReceipt,
  getUserReceipts,
} = require('../../controllers/receiptController');

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

// Mobile app routes
router.post(
  '/receipts',
  appApiKeyAuth,
  appAuthenticateToken,
  upload.single('image'),
  handleMulterError,
  uploadReceipt,
);

router.get('/receipts', appApiKeyAuth, appAuthenticateToken, getUserReceipts);

module.exports = router;
