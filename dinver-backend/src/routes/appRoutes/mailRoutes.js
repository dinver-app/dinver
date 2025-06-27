const express = require('express');
const { handleClaimRequest } = require('../../controllers/mailController');

const router = express.Router();

router.post('/claim-request', handleClaimRequest);

module.exports = router;
