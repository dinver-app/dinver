require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../../models');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { generateTokens } = require('../../utils/tokenUtils');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../../utils/emailService');
const { sendVerificationSMS } = require('../../utils/smsService');

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

const requestEmailVerification = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (user.is_email_verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Generiraj token za verifikaciju
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // Token vrijedi 24 sata

    await user.update({
      email_verification_token: verificationToken,
    });

    // Pošalji email s verifikacijskim linkom
    // Koristi odgovarajući URL ovisno o okruženju
    const baseUrl =
      process.env.NODE_ENV === 'production'
        ? 'https://api.dinver.eu'
        : 'http://localhost:3000';

    const verificationLink = `${baseUrl}/api/app/auth/verify-email/${verificationToken}`;
    await sendVerificationEmail(user.email, verificationLink);

    res.json({ message: 'Verification email sent successfully' });
  } catch (error) {
    console.error('Error sending verification email:', error);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      where: { email_verification_token: token },
    });

    if (!user) {
      return res.send(`
        <html>
          <head>
            <title>Verification Failed</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f5f5f5; }
              .container { text-align: center; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 1rem; }
              .error { color: #dc2626; font-size: 1.5rem; margin-bottom: 1rem; }
              p { color: #4b5563; font-size: 1.1rem; line-height: 1.5; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 class="error">Verification Failed</h1>
              <p>Invalid or expired verification token.</p>
              <p>Please request a new verification email.</p>
            </div>
          </body>
        </html>
      `);
    }

    await user.update({
      is_email_verified: true,
      email_verification_token: null,
    });

    res.send(`
      <html>
        <head>
          <title>Email Verified</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f5f5f5; }
            .container { text-align: center; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 1rem; }
            .success { color: #059669; font-size: 1.5rem; margin-bottom: 1rem; }
            p { color: #4b5563; font-size: 1.1rem; line-height: 1.5; }
            .checkmark { font-size: 4rem; margin-bottom: 1rem; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="checkmark">✓</div>
            <h1 class="success">Email Verified!</h1>
            <p>Your email has been successfully verified.</p>
            <p>You can now close this window and return to the app.</p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error verifying email:', error);
    res.send(`
      <html>
        <head>
          <title>Verification Error</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f5f5f5; }
            .container { text-align: center; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 1rem; }
            .error { color: #dc2626; font-size: 1.5rem; margin-bottom: 1rem; }
            p { color: #4b5563; font-size: 1.1rem; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="error">Verification Error</h1>
            <p>An error occurred while verifying your email.</p>
            <p>Please try again or request a new verification email.</p>
          </div>
        </body>
      </html>
    `);
  }
};

const requestPhoneVerification = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (user.is_phone_verified) {
      return res.status(400).json({ error: 'Phone is already verified' });
    }

    if (!user.phone) {
      return res.status(400).json({
        error:
          'Phone number not found. Please add your phone number in settings first.',
      });
    }

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(user.phone)) {
      return res.status(400).json({
        error:
          'Invalid phone number format. Please update your phone number in settings to use international format (e.g., +385991234567)',
      });
    }

    // Generiraj 6-znamenkasti kod
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    const codeExpiry = new Date();
    codeExpiry.setMinutes(codeExpiry.getMinutes() + 10); // Kod vrijedi 10 minuta

    await user.update({
      phone_verification_code: verificationCode,
      phone_verification_expires_at: codeExpiry,
    });

    // Pošalji SMS s kodom
    await sendVerificationSMS(user.phone, verificationCode);

    res.json({
      message: 'Verification code sent successfully',
      expiresIn: '10 minutes',
    });
  } catch (error) {
    console.error('Error sending verification code:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
};

const verifyPhone = async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.is_phone_verified) {
      return res.status(400).json({ error: 'Phone is already verified' });
    }

    if (!user.phone_verification_code || !user.phone_verification_expires_at) {
      return res.status(400).json({ error: 'No verification code requested' });
    }

    if (new Date() > user.phone_verification_expires_at) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    if (user.phone_verification_code !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    await user.update({
      is_phone_verified: true,
      phone_verification_code: null,
      phone_verification_expires_at: null,
    });

    res.json({ message: 'Phone verified successfully' });
  } catch (error) {
    console.error('Error verifying phone:', error);
    res.status(500).json({ error: 'Failed to verify phone' });
  }
};

module.exports = {
  register,
  login,
  logout,
  checkAuth,
  refreshToken,
  sysadminCheckAuth,
  adminCheckAuth,
  socialLogin,
  requestEmailVerification,
  verifyEmail,
  requestPhoneVerification,
  verifyPhone,
};
