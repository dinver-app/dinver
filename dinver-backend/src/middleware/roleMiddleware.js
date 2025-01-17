const { UserSysadmin, UserAdmin, User } = require('../../models');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

async function checkSysadmin(req, res, next) {
  try {
    const user = await User.findOne({ where: { email: req.body.email } });
    console.log(user);
    const sysadmin = await UserSysadmin.findOne({
      where: { userId: user.id },
    });
    console.log(sysadmin);
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

function authenticateToken(req, res, next) {
  const token = req.cookies.token;
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
