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
 *                     type: integer
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
 * /establishment-types:
 *   get:
 *     summary: Retrieve a list of all establishment types
 *     tags: [EstablishmentTypes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of establishment types
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   icon:
 *                     type: string
 *       500:
 *         description: Server error
 */
router.get(
  '/establishment-types',
  authenticateToken,
  typeController.getAllEstablishmentTypes,
);

/**
 * @swagger
 * /establishment-perks:
 *   get:
 *     summary: Retrieve a list of all establishment perks
 *     tags: [EstablishmentPerks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of establishment perks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   icon:
 *                     type: string
 *       500:
 *         description: Server error
 */
router.get(
  '/establishment-perks',
  authenticateToken,
  typeController.getAllEstablishmentPerks,
);

module.exports = router;
