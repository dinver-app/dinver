const { UserSysadmin, UserAdmin, User, Restaurant } = require('../../models');
const jwt = require('jsonwebtoken');
const { generateTokens } = require('../../utils/tokenUtils');
require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

function authenticateToken(tokenName, refreshTokenName) {
  return function (req, res, next) {
    // Prvo pokušaj dobiti token iz cookieja (web)
    let token = req.cookies[tokenName];
    let refreshToken = req.cookies[refreshTokenName];

    // Ako nema u cookieju, provjeri Authorization header (mobile)
    if (!token && req.headers.authorization) {
      token = req.headers.authorization;
      // Za mobile, refresh token će biti poslan u posebnom headeru
      refreshToken = req.headers['x-refresh-token'];
    }

    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, JWT_SECRET, async (err, decodedUser) => {
      if (err) {
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

          // Ako je web request (ima cookies), postavi nove cookieje
          if (req.cookies[tokenName]) {
            res.cookie(refreshTokenName, newRefreshToken, {
              httpOnly: true,
              secure: true,
            });

            res.cookie(tokenName, accessToken, {
              httpOnly: true,
              secure: true,
            });
          } else {
            // Ako je mobile request, pošalji tokene u response headers
            res.setHeader('X-Access-Token', accessToken);
            res.setHeader('X-Refresh-Token', newRefreshToken);
          }

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

const appApiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.MOBILE_APP_API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  next();
};

const restaurantOwnerAuth = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const restaurantId = req.params.id || req.body.restaurantId;

    if (!restaurantId) {
      return res.status(400).json({ error: 'Restaurant ID is required' });
    }

    // Prvo provjeri je li korisnik sysadmin ili admin
    const sysadmin = await UserSysadmin.findOne({ where: { userId } });
    if (sysadmin) {
      return next();
    }

    const admin = await UserAdmin.findOne({ where: { userId } });
    if (admin) {
      return next();
    }

    // Ako nije admin, provjeri je li vlasnik restorana
    const restaurant = await Restaurant.findByPk(restaurantId);

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    if (restaurant.ownerId !== userId) {
      return res
        .status(403)
        .json({ error: 'Access denied. Restaurant owner only.' });
    }

    next();
  } catch (error) {
    console.error('Error checking restaurant owner:', error);
    res.status(500).json({
      error: 'An error occurred while checking restaurant owner privileges.',
    });
  }
};

module.exports = {
  appAuthenticateToken,
  adminAuthenticateToken,
  sysadminAuthenticateToken,
  checkSysadmin,
  checkAdmin,
  appApiKeyAuth,
  restaurantOwnerAuth,
};
