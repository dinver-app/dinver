const { UserSysadmin, UserAdmin, User } = require('../../models');
const jwt = require('jsonwebtoken');
const { generateTokens } = require('../../utils/tokenUtils');
require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

function authenticateToken(tokenName, refreshTokenName) {
  return function (req, res, next) {
    const token = req.cookies[tokenName];
    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, JWT_SECRET, async (err, decodedUser) => {
      if (err) {
        const refreshToken = req.cookies[refreshTokenName];
        if (!refreshToken) {
          return res.status(401).json({ error: 'Access denied' });
        }

        try {
          const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
          const user = await User.findByPk(decoded.id);

          if (!user) {
            return res.status(403).json({ error: 'Invalid refresh token' });
          }

          const { accessToken, refreshToken: newRefreshToken } =
            generateTokens(user);

          res.cookie(refreshTokenName, newRefreshToken, {
            httpOnly: true,
            secure: true,
          });

          res.cookie(tokenName, accessToken, {
            httpOnly: true,
            secure: true,
          });

          req.user = user;
          return next();
        } catch (refreshError) {
          return res.status(403).json({ error: 'Invalid refresh token' });
        }
      }

      // Dohvati potpune informacije o korisniku iz baze
      const user = await User.findByPk(decodedUser.id);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      req.user = user;
      next();
    });
  };
}

const appAuthenticateToken = authenticateToken(
  'appAccessToken',
  'appRefreshToken',
);
const adminAuthenticateToken = authenticateToken(
  'adminAccessToken',
  'adminRefreshToken',
);
const sysadminAuthenticateToken = authenticateToken(
  'sysadminAccessToken',
  'sysadminRefreshToken',
);

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

module.exports = {
  appAuthenticateToken,
  adminAuthenticateToken,
  sysadminAuthenticateToken,
  checkSysadmin,
  checkAdmin,
};
