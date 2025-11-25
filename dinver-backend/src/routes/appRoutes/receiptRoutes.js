const express = require('express');

const router = express.Router();

// NOTE: All receipt-related routes have been moved to Visit routes
// Visit + Receipt are created together in one atomic operation
// See: /api/app/visits/upload-receipt

module.exports = router;
