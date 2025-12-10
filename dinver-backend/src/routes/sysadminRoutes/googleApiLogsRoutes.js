const express = require('express');
const {
  getGoogleApiLogsSummary,
  getRecentGoogleApiLogs,
  getFailedGoogleApiLogs,
} = require('../../controllers/googleApiLogsController');
const {
  sysadminAuthenticateToken,
  checkSysadmin,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

/**
 * GET /api/sysadmin/google-api-logs/summary
 * Query params: startDate, endDate (optional)
 * Returns: summary stats, daily costs, breakdown by API type/trigger/country
 */
router.get(
  '/google-api-logs/summary',
  sysadminAuthenticateToken,
  checkSysadmin,
  getGoogleApiLogsSummary,
);

/**
 * GET /api/sysadmin/google-api-logs/recent
 * Query params: page, limit (optional)
 * Returns: paginated list of recent Google API calls
 */
router.get(
  '/google-api-logs/recent',
  sysadminAuthenticateToken,
  checkSysadmin,
  getRecentGoogleApiLogs,
);

/**
 * GET /api/sysadmin/google-api-logs/failed
 * Returns: list of failed Google API calls
 */
router.get(
  '/google-api-logs/failed',
  sysadminAuthenticateToken,
  checkSysadmin,
  getFailedGoogleApiLogs,
);

module.exports = router;
