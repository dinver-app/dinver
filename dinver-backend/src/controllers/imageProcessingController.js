/**
 * Controller for image processing status and management
 */

const {
  getJobStatus,
  getQueueStats,
} = require('../../services/imageQueue');
const { getMediaUrlVariants } = require('../../config/cdn');

/**
 * Get image processing job status
 * GET /api/image-processing/status/:jobId
 */
const getImageJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    const status = await getJobStatus(jobId);

    if (status.status === 'not_found') {
      return res.status(404).json({ error: 'Job not found' });
    }

    // If job is completed, return the variant URLs
    if (status.status === 'completed' && status.result) {
      const baseKey = status.result.variants?.medium;
      if (baseKey) {
        status.urls = getMediaUrlVariants(baseKey);
      }
    }

    res.json({
      jobId,
      status: status.status,
      progress: status.progress,
      result: status.result,
      urls: status.urls || null,
      error: status.failedReason || null,
    });
  } catch (error) {
    console.error('Error fetching job status:', error);
    res.status(500).json({ error: 'Failed to fetch job status' });
  }
};

/**
 * Get queue statistics
 * GET /api/image-processing/stats
 */
const getImageQueueStats = async (req, res) => {
  try {
    const stats = await getQueueStats();

    if (!stats) {
      return res.status(500).json({ error: 'Failed to fetch queue stats' });
    }

    res.json(stats);
  } catch (error) {
    console.error('Error fetching queue stats:', error);
    res.status(500).json({ error: 'Failed to fetch queue stats' });
  }
};

/**
 * Health check for image processing system
 * GET /api/image-processing/health
 */
const getImageProcessingHealth = async (req, res) => {
  try {
    const stats = await getQueueStats();

    // Check if Redis/Bull is working
    if (!stats) {
      return res.status(503).json({
        status: 'unhealthy',
        message: 'Queue system is not responding',
      });
    }

    // Check for excessive failed jobs
    const failureRate = stats.total > 0 ? stats.failed / stats.total : 0;
    if (failureRate > 0.1) {
      // More than 10% failure rate
      return res.status(503).json({
        status: 'degraded',
        message: 'High failure rate detected',
        stats,
      });
    }

    res.json({
      status: 'healthy',
      stats,
    });
  } catch (error) {
    console.error('Error checking health:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
};

module.exports = {
  getImageJobStatus,
  getImageQueueStats,
  getImageProcessingHealth,
};
