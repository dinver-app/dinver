const { GoogleApiLog } = require('../../models');
const { Op } = require('sequelize');
const sequelize = require('../../config/database');

/**
 * Get Google API logs summary - daily costs, total, by API type
 * GET /api/sysadmin/google-api-logs/summary?startDate=2024-12-01&endDate=2024-12-10
 */
async function getGoogleApiLogsSummary(req, res) {
  try {
    const { startDate, endDate } = req.query;

    // Default to last 30 days if not provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Total cost and count
    const totalStats = await GoogleApiLog.findOne({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalCalls'],
        [sequelize.fn('SUM', sequelize.col('costUsd')), 'totalCost'],
      ],
      where: {
        createdAt: {
          [Op.between]: [start, end],
        },
      },
      raw: true,
    });

    // Cost by API type
    const byApiType = await GoogleApiLog.findAll({
      attributes: [
        'apiType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'callCount'],
        [sequelize.fn('SUM', sequelize.col('costUsd')), 'totalCost'],
      ],
      where: {
        createdAt: {
          [Op.between]: [start, end],
        },
      },
      group: ['apiType'],
      raw: true,
    });

    // Cost by triggered source
    const byTrigger = await GoogleApiLog.findAll({
      attributes: [
        'triggeredBy',
        [sequelize.fn('COUNT', sequelize.col('id')), 'callCount'],
        [sequelize.fn('SUM', sequelize.col('costUsd')), 'totalCost'],
      ],
      where: {
        createdAt: {
          [Op.between]: [start, end],
        },
      },
      group: ['triggeredBy'],
      raw: true,
    });

    // Daily cost breakdown
    const dailyCosts = await GoogleApiLog.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'callCount'],
        [sequelize.fn('SUM', sequelize.col('costUsd')), 'totalCost'],
      ],
      where: {
        createdAt: {
          [Op.between]: [start, end],
        },
      },
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'DESC']],
      raw: true,
    });

    // Top countries by cost
    const byCountry = await GoogleApiLog.findAll({
      attributes: [
        'country',
        [sequelize.fn('COUNT', sequelize.col('id')), 'callCount'],
        [sequelize.fn('SUM', sequelize.col('costUsd')), 'totalCost'],
      ],
      where: {
        createdAt: {
          [Op.between]: [start, end],
        },
        country: {
          [Op.not]: null,
        },
      },
      group: ['country'],
      order: [[sequelize.fn('SUM', sequelize.col('costUsd')), 'DESC']],
      limit: 10,
      raw: true,
    });

    res.json({
      period: {
        start,
        end,
      },
      total: {
        calls: parseInt(totalStats.totalCalls) || 0,
        cost: parseFloat(totalStats.totalCost) || 0,
      },
      byApiType: byApiType.map((item) => ({
        apiType: item.apiType,
        callCount: parseInt(item.callCount),
        totalCost: parseFloat(item.totalCost),
      })),
      byTrigger: byTrigger.map((item) => ({
        triggeredBy: item.triggeredBy,
        callCount: parseInt(item.callCount),
        totalCost: parseFloat(item.totalCost),
      })),
      dailyCosts: dailyCosts.map((item) => ({
        date: item.date,
        callCount: parseInt(item.callCount),
        totalCost: parseFloat(item.totalCost),
      })),
      byCountry: byCountry.map((item) => ({
        country: item.country,
        callCount: parseInt(item.callCount),
        totalCost: parseFloat(item.totalCost),
      })),
    });
  } catch (error) {
    console.error('[Google API Logs] Error fetching summary:', error);
    res.status(500).json({ error: 'Failed to fetch Google API logs summary' });
  }
}

/**
 * Get recent Google API logs with pagination
 * GET /api/sysadmin/google-api-logs/recent?page=1&limit=50
 */
async function getRecentGoogleApiLogs(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const { count, rows } = await GoogleApiLog.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.json({
      logs: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('[Google API Logs] Error fetching recent logs:', error);
    res.status(500).json({ error: 'Failed to fetch recent Google API logs' });
  }
}

/**
 * Get failed Google API calls
 * GET /api/sysadmin/google-api-logs/failed
 */
async function getFailedGoogleApiLogs(req, res) {
  try {
    const failedLogs = await GoogleApiLog.findAll({
      where: {
        success: false,
      },
      order: [['createdAt', 'DESC']],
      limit: 100,
    });

    res.json({
      failedLogs,
      count: failedLogs.length,
    });
  } catch (error) {
    console.error('[Google API Logs] Error fetching failed logs:', error);
    res.status(500).json({ error: 'Failed to fetch failed Google API logs' });
  }
}

module.exports = {
  getGoogleApiLogsSummary,
  getRecentGoogleApiLogs,
  getFailedGoogleApiLogs,
};
