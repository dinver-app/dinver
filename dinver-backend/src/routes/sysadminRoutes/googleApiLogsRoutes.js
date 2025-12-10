const express = require('express');
const {
  getGoogleApiLogsSummary,
  getRecentGoogleApiLogs,
  getFailedGoogleApiLogs,
} = require('../../controllers/googleApiLogsController');
const { sysadminAuth } = require('../../middlewares/sysadminAuth');

const router = express.Router();

// All routes require sysadmin authentication
router.use(sysadminAuth);

/**
 * GET /api/sysadmin/google-api-logs/summary
 * Query params: startDate, endDate (optional)
 * Returns: summary stats, daily costs, breakdown by API type/trigger/country
 */
router.get('/google-api-logs/summary', getGoogleApiLogsSummary);

/**
 * GET /api/sysadmin/google-api-logs/recent
 * Query params: page, limit (optional)
 * Returns: paginated list of recent Google API calls
 */
router.get('/google-api-logs/recent', getRecentGoogleApiLogs);

/**
 * GET /api/sysadmin/google-api-logs/failed
 * Returns: list of failed Google API calls
 */
router.get('/google-api-logs/failed', getFailedGoogleApiLogs);

module.exports = router;
