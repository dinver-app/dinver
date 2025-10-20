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
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// Mobile app routes
router.post(
  '/receipts',
  appApiKeyAuth,
  appAuthenticateToken,
  upload.single('image'),
  uploadReceipt,
);
router.get('/receipts', appApiKeyAuth, appAuthenticateToken, getUserReceipts);

module.exports = router;
