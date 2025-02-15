const { AuditLog } = require('../../models');
const { Op } = require('sequelize');

async function getAuditLogs(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const { search } = req.query;

    const whereClause = search
      ? {
          [Op.or]: [
            { action: { [Op.iLike]: `%${search}%` } },
            { entity: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : {};

    const { count, rows: logs } = await AuditLog.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({
      totalLogs: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      logs,
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
}

async function getAuditLogsForRestaurant(req, res) {
  try {
    const { restaurantId } = req.params;
    const logs = await AuditLog.findAll({
      where: { restaurantId },
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({
      error: 'An error occurred while fetching audit logs for the restaurant',
    });
  }
}

module.exports = {
  getAuditLogs,
  getAuditLogsForRestaurant,
};
