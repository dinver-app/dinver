require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, UserSettings, PushToken } = require('../../models');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { generateTokens } = require('../../utils/tokenUtils');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../../utils/emailService');
const { sendVerificationSMS } = require('../../utils/smsService');
const { sendPasswordResetEmail } = require('../../utils/emailService');

const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, referralCode } =
      req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Validate referral code BEFORE creating user
    let referralApplied = false;
    let referralCodeData = null;
    let referrerData = null;

    if (referralCode) {
      try {
        // Validate referral code directly without creating referral
        const { ReferralCode, Referral } = require('../../models');

        // Find the referral code
        const refCode = await ReferralCode.findOne({
          where: { code: referralCode.toUpperCase(), isActive: true },
        });

        if (!refCode) {
          return res.status(400).json({ error: 'Invalid referral code' });
        }

        // Check if user is trying to use their own code (we'll check this later with real user ID)
        // For now, just validate the code exists and is active

        referralApplied = true;
        referralCodeData = referralCode;

        // Get referrer information
        const referrer = await User.findByPk(refCode.userId);
        if (referrer) {
          referrerData = {
            firstName: referrer.firstName,
            lastName: referrer.lastName,
            email: referrer.email,
          };
        }
      } catch (referralError) {
        console.error(
          'Referral validation error during registration:',
          referralError,
        );
        return res.status(400).json({ error: 'Invalid referral code' });
      }
    }

    // Only create user if referral validation passed (or no referral code provided)
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      firstName: firstName,
      lastName: lastName,
      email,
      password: hashedPassword,
      phone: phone || null,
      isPhoneVerified: false,
    });

    // Create UserSettings for the new user
    await UserSettings.create({
      userId: user.id,
      language: 'en',
      pushNotifications: true,
      emailNotifications: true,
      smsNotifications: false,
      searchHistory: [],
      isEmailVerified: false,
      isPhoneVerified: false,
    });

    // Now apply the referral code for real and do additional validations
    if (referralApplied) {
      try {
        const { ReferralCode, Referral } = require('../../models');

        // Get the referral code again
        const refCode = await ReferralCode.findOne({
          where: { code: referralCode.toUpperCase(), isActive: true },
        });

        if (!refCode) {
          throw new Error('Referral code no longer valid');
        }

        // Check if user is trying to use their own code
        if (refCode.userId === user.id) {
          throw new Error('Cannot use your own referral code');
        }

        // Check if this user was already referred
        const existingReferral = await Referral.findOne({
          where: { referredUserId: user.id },
        });

        if (existingReferral) {
          throw new Error('User already has a referral');
        }

        // Now apply the referral using the controller
        const { applyReferralCode } = require('./referralController');
        await applyReferralCode(user.id, referralCode);
      } catch (referralError) {
        console.error(
          'Error applying referral code after user creation:',
          referralError,
        );

        // If referral fails, we need to handle the error properly
        if (referralError.message === 'Cannot use your own referral code') {
          // Delete the user and return error
          await User.destroy({ where: { id: user.id } });
          await UserSettings.destroy({ where: { userId: user.id } });
          return res
            .status(400)
            .json({ error: 'Cannot use your own referral code' });
        }

        if (referralError.message === 'User already has a referral') {
          // Delete the user and return error
          await User.destroy({ where: { id: user.id } });
          await UserSettings.destroy({ where: { userId: user.id } });
          return res.status(400).json({ error: 'User already has a referral' });
        }

        // For other errors, we still have a valid user, just without referral
        referralApplied = false;
        referralCodeData = null;
        referrerData = null;
      }
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
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      language: user.language,
      banned: user.banned,
    };

    const responseData = {
      message: 'User registered successfully',
      user: userData,
      token: accessToken,
      refreshToken: refreshToken,
      referralApplied: referralApplied, // Always include this field
    };

    // Add additional referral information if applicable
    if (referralApplied) {
      responseData.referralCode = referralCodeData;
      if (referrerData) {
        responseData.referrer = referrerData;
      }
    }

    res.status(201).json(responseData);
  } catch (error) {
    console.error('Registration error:', error);

    // Provjera za unique constraint error na telefonu
    if (
      error.name === 'SequelizeUniqueConstraintError' &&
      error.errors[0]?.path === 'phone'
    ) {
      return res.status(400).json({ error: 'Phone number already exists' });
    }

    res.status(500).json({ error: 'An error occurred during registration' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for email:', email);

    const user = await User.findOne({ where: { email } });
    console.log('User found:', user ? 'yes' : 'no');

    if (!user || !(await bcrypt.compare(password, user.password))) {
      console.log('Login failed: Invalid credentials');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('Password verified, generating tokens');
    const { accessToken, refreshToken } = generateTokens(user);
    console.log('Tokens generated successfully');

    // Za web aplikaciju
    if (req.headers['user-agent']?.includes('Mozilla')) {
      console.log('Setting cookies for web client');
      res.cookie('appRefreshToken', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
      });
      res.cookie('appAccessToken', accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
      });
    }

    // Filtriraj korisničke podatke
    const userData = {
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      language: user.language,
      banned: user.banned,
    };

    console.log('Login successful, sending response');
    res.status(200).json({
      message: 'Login successful',
      user: userData,
      token: accessToken,
      refreshToken: refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'An error occurred during login' });
  }
};

const logout = async (req, res) => {
  // Clear both cookies
  res.clearCookie('appAccessToken', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
  });
  res.clearCookie('appRefreshToken', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
  });
  res.clearCookie('adminAccessToken', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
  });
  res.clearCookie('adminRefreshToken', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
  });
  res.clearCookie('sysadminAccessToken', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
  });
  res.clearCookie('sysadminRefreshToken', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
  });
  try {
    // Optionally detach/deactivate device push token on logout
    const providedToken = req.body?.pushToken || req.headers['x-push-token'];
    if (providedToken) {
      const tokenRow = await PushToken.findOne({
        where: { token: providedToken },
      });
      if (tokenRow) {
        // Detach from user but keep token active for public pushes
        await tokenRow.update({
          isActive: true,
          userId: null,
          lastSeen: new Date(),
        });
      }
    }
  } catch (e) {
    console.warn('Failed to detach push token on logout:', e?.message || e);
  }
  res.json({ message: 'Logout successful' });
};

const checkAuth = async (req, res) => {
  let token;

  // Try to get access token from cookies or Authorization header
  if (req.cookies?.appAccessToken) {
    token = req.cookies.appAccessToken;
  } else if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ isAuthenticated: false });
  }

  try {
    // First try to verify the access token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(403).json({ isAuthenticated: false });
    }

    // If access token is valid and we're close to expiry (less than 30 seconds left),
    // proactively refresh both tokens
    const tokenData = jwt.decode(token);
    const timeUntilExpiry = tokenData.exp - Math.floor(Date.now() / 1000);

    if (timeUntilExpiry < 30) {
      // Less than 30 seconds left
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
        generateTokens(user);

      // Set cookies for web client
      if (req.cookies?.appAccessToken) {
        res.cookie('appRefreshToken', newRefreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        });

        res.cookie('appAccessToken', newAccessToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        });
      } else {
        // For mobile client, send tokens in response headers
        res.setHeader('X-Access-Token', newAccessToken);
        res.setHeader('X-Refresh-Token', newRefreshToken);
      }

      return res.json({
        isAuthenticated: true,
        accessToken: newAccessToken,
      });
    }

    return res.json({ isAuthenticated: true });
  } catch (err) {
    // If access token is invalid or expired, try refresh token
    const refreshToken =
      req.cookies?.appRefreshToken || req.headers['x-refresh-token'];
    if (!refreshToken) {
      return res.status(401).json({ isAuthenticated: false });
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
      );
      const user = await User.findByPk(decoded.id);

      if (!user) {
        return res.status(403).json({ isAuthenticated: false });
      }

      // Generate new tokens - both access and refresh tokens are renewed
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
        generateTokens(user);

      // Set new cookies with renewed expiration for web client
      if (req.cookies?.appAccessToken) {
        res.cookie('appRefreshToken', newRefreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        });

        res.cookie('appAccessToken', newAccessToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        });
      } else {
        // For mobile client, send tokens in response headers
        res.setHeader('X-Access-Token', newAccessToken);
        res.setHeader('X-Refresh-Token', newRefreshToken);
      }

      return res.json({
        isAuthenticated: true,
        accessToken: newAccessToken,
      });
    } catch (refreshError) {
      // If refresh token is also invalid, user needs to login again
      return res.status(403).json({ isAuthenticated: false });
    }
  }
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
  // Get refresh token from cookie or header
  let refreshToken = req.cookies?.appRefreshToken;
  if (!refreshToken && req.headers['x-refresh-token']) {
    refreshToken = req.headers['x-refresh-token'];
  }

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    // Za web aplikaciju
    if (req.headers['user-agent']?.includes('Mozilla')) {
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
    } else {
      // Za mobile aplikaciju
      res.setHeader('X-Access-Token', accessToken);
      res.setHeader('X-Refresh-Token', newRefreshToken);
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

    res.json({
      message: 'Tokens refreshed successfully',
      user: userData,
      token: accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
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
        firstName: firstName,
        lastName: lastName,
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
    const userSettings = await UserSettings.findOne({
      where: { userId: req.user.id },
    });

    if (!userSettings) {
      return res.status(404).json({ error: 'User settings not found' });
    }

    if (userSettings.isEmailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Generiraj token za verifikaciju
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // Token vrijedi 24 sata

    await userSettings.update({
      emailVerificationToken: verificationToken,
      emailVerificationExpiresAt: tokenExpiry,
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

    const userSettings = await UserSettings.findOne({
      where: { emailVerificationToken: token },
    });

    if (!userSettings) {
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

    // Check if token is expired
    if (
      userSettings.emailVerificationExpiresAt &&
      new Date() > userSettings.emailVerificationExpiresAt
    ) {
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
              <p>Verification token has expired.</p>
              <p>Please request a new verification email.</p>
            </div>
          </body>
        </html>
      `);
    }

    // Get user data
    const user = await User.findByPk(userSettings.userId);
    if (!user) {
      console.error('User not found for userId:', userSettings.userId);
      return res.status(404).send(`
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

    // Update user settings
    await userSettings.update({
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
      isEmailVerified: true,
    });

    // Check if user is now fully verified (email + phone) and was referred
    if (userSettings.isPhoneVerified && user.referredByCode) {
      try {
        // Check if verification points were already awarded
        const { UserPointsHistory } = require('../../models');
        const existingPoints = await UserPointsHistory.findOne({
          where: {
            userId: user.id,
            actionType: 'referral_verification_referred',
          },
        });

        if (!existingPoints) {
          // Find the referrer
          const referrer = await User.findOne({
            where: { referralCode: user.referredByCode },
          });

          if (referrer) {
            const PointsService = require('../utils/pointsService');
            const pointsService = new PointsService(
              require('../../models').sequelize,
            );

            // Award referral verification points to both users
            await pointsService.addReferralVerificationPoints(
              referrer.id,
              user.id,
              user.referredByCode,
            );
          }
        }
      } catch (referralError) {
        console.error(
          'Error awarding referral verification points:',
          referralError,
        );
        // Don't fail the verification if referral bonus fails
      }
    }

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
    const userSettings = await UserSettings.findOne({
      where: { userId: req.user.id },
    });

    if (!userSettings) {
      return res.status(404).json({ error: 'User settings not found' });
    }

    if (userSettings.isPhoneVerified) {
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

    await userSettings.update({
      phoneVerificationCode: verificationCode,
      phoneVerificationExpiresAt: codeExpiry,
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
    const userSettings = await UserSettings.findOne({
      where: { userId: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!userSettings) {
      return res.status(404).json({ error: 'User settings not found' });
    }

    if (userSettings.isPhoneVerified) {
      return res.status(400).json({ error: 'Phone is already verified' });
    }

    if (
      !userSettings.phoneVerificationCode ||
      !userSettings.phoneVerificationExpiresAt
    ) {
      return res.status(400).json({ error: 'No verification code requested' });
    }

    if (new Date() > userSettings.phoneVerificationExpiresAt) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    if (userSettings.phoneVerificationCode !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Update User record
    await userSettings.update({
      phoneVerificationCode: null,
      phoneVerificationExpiresAt: null,
    });

    // Update UserSettings record
    await userSettings.update({
      isPhoneVerified: true,
    });

    // Check if user is now fully verified (email + phone) and was referred
    if (userSettings.isEmailVerified && user.referredByCode) {
      try {
        // Check if verification points were already awarded
        const { UserPointsHistory } = require('../../models');
        const existingPoints = await UserPointsHistory.findOne({
          where: {
            userId: user.id,
            actionType: 'referral_verification_referred',
          },
        });

        if (!existingPoints) {
          // Find the referrer
          const referrer = await User.findOne({
            where: { referralCode: user.referredByCode },
          });

          if (referrer) {
            const PointsService = require('../utils/pointsService');
            const pointsService = new PointsService(
              require('../../models').sequelize,
            );

            // Award referral verification points to both users
            await pointsService.addReferralVerificationPoints(
              referrer.id,
              user.id,
              user.referredByCode,
            );
          }
        }
      } catch (referralError) {
        console.error(
          'Error awarding referral verification points:',
          referralError,
        );
        // Don't fail the verification if referral bonus fails
      }
    }

    res.json({ message: 'Phone verified successfully' });
  } catch (error) {
    console.error('Error verifying phone:', error);
    res.status(500).json({ error: 'Failed to verify phone' });
  }
};

// Dohvaćanje verifikacijskog statusa korisnika
const getVerificationStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await UserSettings.findOne({
      where: { userId },
      attributes: ['isEmailVerified', 'isPhoneVerified'],
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
    });
  } catch (error) {
    console.error('Error fetching verification status:', error);
    res.status(500).json({ error: 'Failed to fetch verification status' });
  }
};

// Zahtjev za reset lozinke
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Pronađi korisnika po email adresi
    const user = await User.findOne({ where: { email } });

    // Čak i ako korisnik ne postoji, vratimo isti odgovor iz sigurnosnih razloga
    // Tako napadač ne može doznati postoji li email ili ne
    if (!user) {
      return res.status(200).json({
        message:
          'If a user with that email exists, a password reset link has been sent to their email',
      });
    }

    // Dohvati ili kreiraj korisničke postavke
    let userSettings = await UserSettings.findOne({
      where: { userId: user.id },
    });

    if (!userSettings) {
      userSettings = await UserSettings.create({
        userId: user.id,
        language: 'en',
        pushNotifications: true,
        emailNotifications: true,
        smsNotifications: false,
        searchHistory: [],
        isEmailVerified: false,
        isPhoneVerified: false,
      });
    }

    // Generiraj token za reset lozinke
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 1); // Token vrijedi 1 sat

    // Spremi token i vrijeme isteka u bazu
    await userSettings.update({
      passwordResetToken: resetToken,
      passwordResetExpiresAt: tokenExpiry,
    });

    // Pošalji email s linkom za reset lozinke
    const baseUrl =
      process.env.NODE_ENV === 'production'
        ? 'https://api.dinver.eu'
        : 'http://localhost:3000';

    const resetLink = `${baseUrl}/api/app/auth/reset-password/${resetToken}`;
    await sendPasswordResetEmail(user.email, resetLink);

    res.status(200).json({
      message:
        'If a user with that email exists, a password reset link has been sent to their email',
    });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while processing your request' });
  }
};

// Reset lozinke s tokenom
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    // Provjeri je li poslan novi password
    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    // Provjeri minimalnu duljinu lozinke
    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 8 characters long' });
    }

    // Pronađi korisničke postavke s tim tokenom
    const userSettings = await UserSettings.findOne({
      where: { passwordResetToken: token },
    });

    if (!userSettings) {
      return res
        .status(400)
        .json({ error: 'Invalid or expired password reset token' });
    }

    // Provjeri je li token istekao
    if (new Date() > userSettings.passwordResetExpiresAt) {
      return res
        .status(400)
        .json({ error: 'Password reset token has expired' });
    }

    // Pronađi korisnika
    const user = await User.findByPk(userSettings.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Provjeri je li nova lozinka ista kao stara
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        error: 'New password must be different from your current password',
      });
    }

    // Kriptiraj novu lozinku
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Ažuriraj lozinku korisnika
    await user.update({ password: hashedPassword });

    // Poništi token za reset
    await userSettings.update({
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    });

    // Vrati uspješan odgovor
    res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while resetting your password' });
  }
};

// HTML stranica za reset lozinke
const resetPasswordForm = async (req, res) => {
  try {
    const { token } = req.params;

    // Provjeri je li token valjan
    const userSettings = await UserSettings.findOne({
      where: { passwordResetToken: token },
    });

    if (!userSettings) {
      return res.send(`
        <html>
          <head>
            <title>Password Reset Failed</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f5f5f5; }
              .container { text-align: center; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 1rem; max-width: 500px; width: 100%; }
              .error { color: #dc2626; font-size: 1.5rem; margin-bottom: 1rem; }
              p { color: #4b5563; font-size: 1.1rem; line-height: 1.5; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 class="error">Password Reset Failed</h1>
              <p>Invalid or expired password reset token.</p>
              <p>Please request a new password reset link.</p>
            </div>
          </body>
        </html>
      `);
    }

    // Provjeri je li token istekao
    if (new Date() > userSettings.passwordResetExpiresAt) {
      return res.send(`
        <html>
          <head>
            <title>Password Reset Failed</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f5f5f5; }
              .container { text-align: center; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 1rem; max-width: 500px; width: 100%; }
              .error { color: #dc2626; font-size: 1.5rem; margin-bottom: 1rem; }
              p { color: #4b5563; font-size: 1.1rem; line-height: 1.5; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 class="error">Password Reset Failed</h1>
              <p>Password reset token has expired.</p>
              <p>Please request a new password reset link.</p>
            </div>
          </body>
        </html>
      `);
    }

    // Prikaži formu za reset lozinke
    res.send(`
      <html>
        <head>
          <title>Reset Your Password</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f5f5f5; }
            .container { text-align: center; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 1rem; max-width: 500px; width: 100%; }
            .heading { color: #111827; font-size: 1.5rem; margin-bottom: 1.5rem; }
            p { color: #4b5563; font-size: 1.1rem; line-height: 1.5; margin-bottom: 1.5rem; }
            form { display: flex; flex-direction: column; }
            input { padding: 0.75rem; margin-bottom: 1rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 1rem; }
            button { background-color: #4CAF50; color: white; border: none; padding: 0.75rem; border-radius: 0.375rem; font-size: 1rem; cursor: pointer; }
            button:hover { background-color: #43a047; }
            .error-message { color: #dc2626; margin-top: 1rem; display: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="heading">Reset Your Password</h1>
            <p>Please enter your new password below:</p>
            <form id="resetForm">
              <input type="password" id="password" placeholder="New password" minlength="8" required>
              <input type="password" id="confirmPassword" placeholder="Confirm new password" minlength="8" required>
              <button type="submit">Reset Password</button>
              <p id="errorMessage" class="error-message"></p>
            </form>
          </div>

          <script>
            document.getElementById('resetForm').addEventListener('submit', async (e) => {
              e.preventDefault();
              
              const password = document.getElementById('password').value;
              const confirmPassword = document.getElementById('confirmPassword').value;
              const errorMessage = document.getElementById('errorMessage');
              
              // Reset error message
              errorMessage.style.display = 'none';
              
              // Check if passwords match
              if (password !== confirmPassword) {
                errorMessage.textContent = 'Passwords do not match';
                errorMessage.style.display = 'block';
                return;
              }
              
              try {
                const response = await fetch('/api/app/auth/reset-password/${token}', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ newPassword: password }),
                });
                
                const data = await response.json();
                
                if (response.ok) {
                  // Show success message
                  document.querySelector('.container').innerHTML = \`
                    <h1 style="color: #059669; font-size: 1.5rem; margin-bottom: 1rem;">Success!</h1>
                    <div style="font-size: 4rem; margin-bottom: 1rem;">✓</div>
                    <p>Your password has been reset successfully.</p>
                    <p>You can now log in with your new password.</p>
                  \`;
                } else {
                  errorMessage.textContent = data.error || 'An error occurred';
                  errorMessage.style.display = 'block';
                }
              } catch (error) {
                errorMessage.textContent = 'An error occurred while resetting your password';
                errorMessage.style.display = 'block';
              }
            });
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error displaying reset form:', error);
    res.status(500).send(`
      <html>
        <head>
          <title>Password Reset Error</title>
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
            <h1 class="error">Password Reset Error</h1>
            <p>An error occurred while processing your request.</p>
            <p>Please try again or request a new password reset link.</p>
          </div>
        </body>
      </html>
    `);
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
  getVerificationStatus,
  requestPasswordReset,
  resetPassword,
  resetPasswordForm,
};
