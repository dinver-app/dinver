require('dotenv').config();
const { OAuth2Client } = require('google-auth-library');
const { User, UserSettings } = require('../../models');
const { generateTokens } = require('../../utils/tokenUtils');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleSignIn = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'Google ID token is required' });
    }

    // Verify Google ID token
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (verifyError) {
      console.error('Google token verification error:', verifyError);
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    const payload = ticket.getPayload();
    const googleId = payload['sub'];
    const email = payload['email'];
    const firstName = payload['given_name'] || '';
    const lastName = payload['family_name'] || '';
    const profileImage = payload['picture'] || null;

    // Check if user exists by googleId or email
    let user = await User.findOne({
      where: { googleId: googleId },
    });

    // If not found by googleId, check by email
    if (!user) {
      user = await User.findOne({
        where: { email: email },
      });
    }

    let isNewUser = false;

    // If user doesn't exist, create new user
    if (!user) {
      isNewUser = true;

      // Create new user
      user = await User.create({
        googleId: googleId,
        email: email,
        firstName: firstName,
        lastName: lastName,
        profileImage: profileImage,
        password: null, // Google users don't have password
      });

      // Create UserSettings for the new user
      await UserSettings.create({
        userId: user.id,
        language: 'en',
        pushNotifications: true,
        emailNotifications: true,
        smsNotifications: false,
        searchHistory: [],
        isEmailVerified: true, // Google emails are verified
        isPhoneVerified: false,
      });

      // Prepare response for new user
      const { accessToken, refreshToken } = generateTokens(user);

      // Filter user data
      const userData = {
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        language: user.language,
        banned: user.banned,
        profileImage: user.profileImage,
      };

      return res.status(201).json({
        message: 'Google sign up successful',
        isNewUser: true,
        user: userData,
        token: accessToken,
        refreshToken: refreshToken,
      });
    }

    // User exists - update googleId if signing in with Google for first time
    if (!user.googleId) {
      await user.update({ googleId: googleId });
    }

    // Update profile image if changed
    if (profileImage && user.profileImage !== profileImage) {
      await user.update({ profileImage: profileImage });
    }

    // Make sure UserSettings exists for existing users
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
        isEmailVerified: true, // Google emails are verified
        isPhoneVerified: false,
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Filter user data
    const userData = {
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      language: user.language,
      banned: user.banned,
      profileImage: user.profileImage,
    };

    res.status(200).json({
      message: 'Google sign in successful',
      isNewUser: false,
      user: userData,
      token: accessToken,
      refreshToken: refreshToken,
    });
  } catch (error) {
    console.error('Google sign in error:', error);
    res.status(500).json({ error: 'An error occurred during Google sign in' });
  }
};

module.exports = {
  googleSignIn,
};
