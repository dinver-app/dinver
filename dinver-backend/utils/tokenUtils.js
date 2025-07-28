const jwt = require('jsonwebtoken');

/**
 * Generates access and refresh tokens for a user
 * Access token is used for regular API calls (1 minute for testing)
 * Refresh token is used to get new access tokens (3 minutes for testing)
 */
function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    {
      expiresIn: '1m', // Access token lasts 1 minute for testing
    },
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: '3m', // Refresh token lasts 3 minutes for testing
    },
  );

  return { accessToken, refreshToken };
}

module.exports = { generateTokens };
