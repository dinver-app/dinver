require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../../models');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { generateTokens } = require('../../utils/tokenUtils');

const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });

    const { accessToken, refreshToken } = generateTokens(user);

    // Za web aplikaciju
    if (req.headers['user-agent']?.includes('Mozilla')) {
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
      });
      res.cookie('token', accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
      });
    }

    // Filtriraj korisničke podatke
    const userData = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      language: user.language,
      banned: user.banned,
    };

    res.status(201).json({
      message: 'User registered successfully',
      user: userData,
      token: accessToken,
      refreshToken: refreshToken,
    });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred during registration' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    // Za web aplikaciju
    if (req.headers['user-agent']?.includes('Mozilla')) {
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
      });
      res.cookie('token', accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
      });
    }

    // Filtriraj korisničke podatke
    const userData = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      language: user.language,
      banned: user.banned,
    };

    // Dodaj tokene u response body za mobilnu aplikaciju
    res.status(200).json({
      message: 'Login successful',
      user: userData,
      token: accessToken,
      refreshToken: refreshToken,
    });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred during login' });
  }
};

const logout = (req, res) => {
  res.clearCookie('token');
  res.clearCookie('refreshToken');
  res.json({ message: 'Logout successful' });
};

const checkAuth = async (req, res) => {
  let token;

  if (req.cookies?.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ isAuthenticated: false });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
    if (err) {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        return res.status(401).json({ isAuthenticated: false });
      }

      try {
        const decoded = jwt.verify(
          refreshToken,
          process.env.REFRESH_TOKEN_SECRET,
        );
        const user = await User.findByPk(decoded.id);

        if (!user) {
          return res.status(403).json({ isAuthenticated: false });
        }

        const { accessToken, refreshToken: newRefreshToken } =
          generateTokens(user);

        res.cookie('appRefreshToken', newRefreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        });

        res.cookie('appAccessToken', accessToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        });

        return res.json({ isAuthenticated: true, accessToken });
      } catch (refreshError) {
        return res.status(403).json({ isAuthenticated: false });
      }
    }

    res.json({ isAuthenticated: true });
  });
};

const sysadminCheckAuth = async (req, res) => {
  const token = req.cookies.sysadminAccessToken;
  if (!token) {
    return res.status(401).json({ isAuthenticated: false });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
    if (err) {
      const refreshToken = req.cookies.sysadminRefreshToken;
      if (!refreshToken) {
        return res.status(401).json({ isAuthenticated: false });
      }

      try {
        const decoded = jwt.verify(
          refreshToken,
          process.env.REFRESH_TOKEN_SECRET,
        );
        const user = await User.findByPk(decoded.id);

        if (!user) {
          return res.status(403).json({ isAuthenticated: false });
        }

        const { accessToken, refreshToken: newRefreshToken } =
          generateTokens(user);

        res.cookie('sysadminRefreshToken', newRefreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        });

        res.cookie('sysadminAccessToken', accessToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        });

        return res.json({ isAuthenticated: true, accessToken });
      } catch (refreshError) {
        return res.status(403).json({ isAuthenticated: false });
      }
    }

    res.json({ isAuthenticated: true });
  });
};

const adminCheckAuth = async (req, res) => {
  const token = req.cookies.adminAccessToken;
  if (!token) {
    return res.status(401).json({ isAuthenticated: false });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
    if (err) {
      const refreshToken = req.cookies.adminRefreshToken;
      if (!refreshToken) {
        return res.status(401).json({ isAuthenticated: false });
      }

      try {
        const decoded = jwt.verify(
          refreshToken,
          process.env.REFRESH_TOKEN_SECRET,
        );
        const user = await User.findByPk(decoded.id);

        if (!user) {
          return res.status(403).json({ isAuthenticated: false });
        }

        const { accessToken, refreshToken: newRefreshToken } =
          generateTokens(user);

        res.cookie('adminRefreshToken', newRefreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        });

        res.cookie('adminAccessToken', accessToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        });

        return res.json({ isAuthenticated: true, accessToken });
      } catch (refreshError) {
        return res.status(403).json({ isAuthenticated: false });
      }
    }

    res.json({ isAuthenticated: true });
  });
};

async function refreshToken(req, res) {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken)
    return res.status(401).json({ error: 'Refresh token required' });

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) return res.status(403).json({ error: 'Invalid refresh token' });

    const { accessToken, newRefreshToken } = generateTokens(user);
    res.cookie('sysadminRefreshToken', newRefreshToken, {
      httpOnly: true,
      secure: true,
    });
    res.cookie('sysadminAccessToken', accessToken, {
      httpOnly: true,
      secure: true,
    });

    res.json({ accessToken });
  } catch (error) {
    res.status(403).json({ error: 'Invalid refresh token' });
  }
}

const socialLogin = async (req, res) => {
  try {
    const { email, firstName, lastName, photoURL, provider } = req.body;

    let user = await User.findOne({ where: { email } });

    if (!user) {
      user = await User.create({
        email,
        firstName,
        lastName,
        photoURL,
        provider,
      });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    res.status(200).json({
      message: 'Social login successful',
      user,
      token: accessToken,
      refreshToken: refreshToken,
    });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred during social login' });
  }
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ where: { googleId: profile.id } });
        if (!user) {
          user = await User.create({
            googleId: profile.id,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            email: profile.emails[0].value,
          });
        }
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = {
  register,
  login,
  logout,
  checkAuth,
  refreshToken,
  sysadminCheckAuth,
  adminCheckAuth,
  socialLogin,
};
