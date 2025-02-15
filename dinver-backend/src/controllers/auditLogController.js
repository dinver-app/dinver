const { AuditLog } = require('../../models');

async function getAuditLogs(req, res) {
  try {
    const logs = await AuditLog.findAll();
    res.json(logs);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while fetching audit logs' });
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
