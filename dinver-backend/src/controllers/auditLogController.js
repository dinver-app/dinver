const { AuditLog, User, Restaurant } = require('../../models');
const { Op } = require('sequelize');

async function getAuditLogs(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const { search, action } = req.query;

    const whereClause = {
      ...(search && {
        [Op.or]: [
          { action: { [Op.iLike]: `%${search}%` } },
          { entity: { [Op.iLike]: `%${search}%` } },
        ],
      }),
      ...(action && { action }),
    };

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
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const { action, search } = req.query;

    const whereClause = {
      restaurantId,
      ...(search && {
        [Op.or]: [
          { action: { [Op.iLike]: `%${search}%` } },
          { entity: { [Op.iLike]: `%${search}%` } },
        ],
      }),
      ...(action && { action }),
    };

    const { count, rows: logs } = await AuditLog.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          attributes: ['email'],
          as: 'user',
        },
        {
          model: Restaurant,
          attributes: ['name'],
          as: 'restaurant',
        },
      ],
    });

    const logsWithDetails = logs.map((log) => ({
      ...log.toJSON(),
      userEmail: log.user ? log.user.email : 'Unknown User',
      restaurantName: log.restaurant
        ? log.restaurant.name
        : 'Unknown Restaurant',
    }));

    res.json({
      totalLogs: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      logs: logsWithDetails,
    });
  } catch (error) {
    console.error('Error fetching audit logs for restaurant:', error);
    res.status(500).json({
      error: 'An error occurred while fetching audit logs for the restaurant',
    });
  }
}

module.exports = {
  getAuditLogs,
  getAuditLogsForRestaurant,
};
