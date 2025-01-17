const express = require('express');
const adminController = require('../controllers/adminController');
const { checkAdmin } = require('../middleware/roleMiddleware');

const router = express.Router();

module.exports = router;
