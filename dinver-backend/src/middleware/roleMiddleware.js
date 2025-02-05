const { UserSysadmin, UserAdmin, User } = require('../../models');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

async function checkSysadmin(req, res, next) {
  console.log('checkSysadmin');
  try {
    console.log('test');
    console.log(req.user);
    const userId = req.user.id;
    const sysadmin = await UserSysadmin.findOne({
      where: { userId },
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
    const sysadmin = await UserSysadmin.findOne({
      where: { userId: req.user.id },
    });

    if (sysadmin) {
      return next();
    }

    const admin = await UserAdmin.findOne({
      where: { userId: req.user.id, restaurantId, role: 'admin' },
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

function authenticateToken(req, res, next, token = null) {
  token = token || req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

module.exports = {
  checkSysadmin,
  checkAdmin,
  authenticateToken,
};
