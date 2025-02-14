const jwt = require('jsonwebtoken');

function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    {
      expiresIn: '1h',
    },
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: '1d',
    },
  );

  return { accessToken, refreshToken };
}

module.exports = { generateTokens };
