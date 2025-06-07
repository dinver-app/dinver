const jwt = require('jsonwebtoken');

/**
 * Generates access and refresh tokens for a user
 * Access token is used for regular API calls (24 hours)
 * Refresh token is used to get new access tokens (90 days)
 */
function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    {
      expiresIn: '24h', // Access token lasts 24 hours
    },
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: '90d', // Refresh token lasts 90 days
    },
  );

  return { accessToken, refreshToken };
}

module.exports = { generateTokens };
