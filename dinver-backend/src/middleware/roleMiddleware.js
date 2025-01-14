const { UserSysadmin, UserAdmin } = require('../../models');

async function checkSysadmin(req, res, next) {
  try {
    const sysadmin = await UserSysadmin.findOne({
      where: { userId: req.user.id },
    });

    if (!sysadmin) {
      return res.status(403).json({ error: 'Access denied. Sysadmin only.' });
    }

    next();
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while checking sysadmin privileges.' });
  }
}

async function checkAdmin(req, res, next) {
  try {
    const { restaurantId } = req.body;

    const admin = await UserAdmin.findOne({
      where: { userId: req.user.id, restaurantId },
    });

    if (!admin) {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    next();
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while checking admin privileges.' });
  }
}

module.exports = {
  checkSysadmin,
  checkAdmin,
};
