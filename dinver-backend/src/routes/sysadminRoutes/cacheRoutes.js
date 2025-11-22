const express = require('express');
const { getCacheStats, clearUnusedCache } = require('../../services/googlePlacesCache');
const {
  checkSysadmin,
  sysadminAuthenticateToken,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

/**
 * GET /api/sysadmin/cache/stats
 * Get Google Places cache statistics
 */
router.get(
  '/cache/stats',
  sysadminAuthenticateToken,
  checkSysadmin,
  async (req, res) => {
    try {
      const stats = await getCacheStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('[Cache Stats] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch cache statistics',
        details: error.message,
      });
    }
  },
);

/**
 * DELETE /api/sysadmin/cache/unused
 * Clear unused cache entries
 * Query params: ?days=90 (default: 90 days)
 */
router.delete(
  '/cache/unused',
  sysadminAuthenticateToken,
  checkSysadmin,
  async (req, res) => {
    try {
      const days = parseInt(req.query.days) || 90;
      const deleted = await clearUnusedCache(days);

      res.json({
        success: true,
        message: `Cleared ${deleted} unused cache entries older than ${days} days`,
        deleted,
      });
    } catch (error) {
      console.error('[Cache Cleanup] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear cache',
        details: error.message,
      });
    }
  },
);

module.exports = router;
