/**
 * Routes for image processing status and management
 */

const express = require('express');
const router = express.Router();
const {
  getImageJobStatus,
  getImageQueueStats,
  getImageProcessingHealth,
} = require('../controllers/imageProcessingController');

// Public route - anyone can check job status with jobId
router.get('/status/:jobId', getImageJobStatus);

// Admin route - get queue statistics
router.get('/stats', getImageQueueStats);

// Health check - public
router.get('/health', getImageProcessingHealth);

module.exports = router;
