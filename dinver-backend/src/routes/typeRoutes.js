const express = require('express');
const typeController = require('../controllers/typeController');
const { authenticateToken } = require('../middleware/roleMiddleware');

const router = express.Router();

/**
 * @swagger
 * /food-types:
 *   get:
 *     summary: Retrieve a list of all food types
 *     tags: [FoodTypes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of food types
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   name:
 *                     type: string
 *                   icon:
 *                     type: string
 *       500:
 *         description: Server error
 */
router.get('/food-types', authenticateToken, typeController.getAllFoodTypes);

/**
 * @swagger
 * /venue-types:
 *   get:
 *     summary: Retrieve a list of all venue types
 *     tags: [VenueTypes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of venue types
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   name:
 *                     type: string
 *                   icon:
 *                     type: string
 *       500:
 *         description: Server error
 */
router.get('/venue-perks', authenticateToken, typeController.getAllVenuePerks);

module.exports = router;
