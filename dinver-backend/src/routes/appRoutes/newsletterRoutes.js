const express = require('express');
const router = express.Router();
const newsletterController = require('../../controllers/newsletterController');

// Public routes
router.post('/newsletter/subscribe', newsletterController.subscribe);
router.get('/newsletter/unsubscribe/:token', newsletterController.unsubscribe);

module.exports = router;
