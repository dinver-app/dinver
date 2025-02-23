const { UserSysadmin, UserAdmin, User } = require('../../models');
const jwt = require('jsonwebtoken');
const { generateTokens } = require('../../utils/tokenUtils');
const JWT_SECRET = process.env.JWT_SECRET;

async function checkSysadmin(req, res, next) {
  try {
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
    const sysadmin = await UserSysadmin.findOne({
      where: { userId: req.user.id },
    });

    if (sysadmin) {
      return next();
    }

    const admin = await UserAdmin.findOne({
      where: { userId: req.user.id },
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
  let token, refreshToken;

  if (req.hostname === 'sysadmin.dinver.eu' || req.hostname === 'localhost') {
    token = req.cookies.token_sysadmin;
    refreshToken = req.cookies.refreshToken_sysadmin;
  } else if (
    req.hostname === 'admin.dinver.eu' ||
    req.hostname === 'localhost'
  ) {
    token = req.cookies.token_admin;
    refreshToken = req.cookies.refreshToken_admin;
  } else {
    return res.status(401).json({ error: 'Access denied' });
  }

  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      if (!refreshToken) {
        return res.status(401).json({ error: 'Access denied' });
      }

      try {
        const decoded = jwt.verify(
          refreshToken,
          process.env.REFRESH_TOKEN_SECRET,
        );
        const user = await User.findByPk(decoded.id);

        if (!user) {
          return res.status(403).json({ error: 'Invalid refresh token' });
        }

        const { accessToken, refreshToken: newRefreshToken } =
          generateTokens(user);

        if (
          req.hostname === 'sysadmin.dinver.eu' ||
          req.hostname === 'localhost'
        ) {
          res.cookie('refreshToken_sysadmin', newRefreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            domain: 'sysadmin.dinver.eu',
          });

          res.cookie('token_sysadmin', accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            domain: 'sysadmin.dinver.eu',
          });
        } else if (
          req.hostname === 'admin.dinver.eu' ||
          req.hostname === 'localhost'
        ) {
          res.cookie('refreshToken_admin', newRefreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            domain: 'admin.dinver.eu',
          });

          res.cookie('token_admin', accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            domain: 'admin.dinver.eu',
          });
        }

        req.user = user;
        return next();
      } catch (refreshError) {
        return res.status(403).json({ error: 'Invalid refresh token' });
      }
    }

    req.user = user;
    next();
  });
}

module.exports = {
  checkSysadmin,
  checkAdmin,
  authenticateToken,
};
