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

module.exports = {
  getAuditLogs,
};
