const express = require('express');
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/roleMiddleware');

const router = express.Router();

router.put('/language', authenticateToken, userController.updateUserLanguage);
router.get('/language', authenticateToken, userController.getUserLanguage);
router.get('/:id', authenticateToken, userController.getUserById);

module.exports = router;
