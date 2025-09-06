const rateLimit = require('express-rate-limit');

// Simple limiter for AI endpoint: 60 req / 1 min per key (fallback IP)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, _res) => req.headers['x-api-key'] || req.ip,
});

module.exports = { aiLimiter };
