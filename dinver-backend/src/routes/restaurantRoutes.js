const express = require('express');
const restaurantController = require('../controllers/restaurantController');
const { checkAdmin } = require('../middleware/roleMiddleware');

const router = express.Router();

/**
 * @swagger
 * /restaurants:
 *   get:
 *     summary: Get all restaurants
 *     tags: [Restaurants]
 *     responses:
 *       200:
 *         description: A list of restaurants
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   address:
 *                     type: string
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   rating:
 *                     type: number
 *                   user_ratings_total:
 *                     type: integer
 *                   price_level:
 *                     type: integer
 *                   opening_hours:
 *                     type: string
 *                   icon_url:
 *                     type: string
 */
router.get('/', restaurantController.getAllRestaurants);

/**
 * @swagger
 * /restaurants/{id}:
 *   get:
 *     summary: Get restaurant details by ID
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The restaurant ID
 *     responses:
 *       200:
 *         description: Restaurant details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                 address:
 *                   type: string
 *                 latitude:
 *                   type: number
 *                 longitude:
 *                   type: number
 *                 rating:
 *                   type: number
 *                 user_ratings_total:
 *                   type: integer
 *                 price_level:
 *                   type: integer
 *                 opening_hours:
 *                   type: string
 *                 icon_url:
 *                   type: string
 *       404:
 *         description: Restaurant not found
 */
router.get('/:id', restaurantController.getRestaurantDetails);

/**
 * @swagger
 * /restaurants/{id}:
 *   put:
 *     summary: Update restaurant details
 *     tags: [Restaurants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The restaurant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               address:
 *                 type: string
 *               openingHours:
 *                 type: string
 *     responses:
 *       200:
 *         description: Restaurant updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 address:
 *                   type: string
 *                 openingHours:
 *                   type: string
 *       403:
 *         description: Access denied. Only admins can perform this action.
 *       404:
 *         description: Restaurant not found
 */
router.put('/:id', checkAdmin, restaurantController.updateRestaurant);

module.exports = router;
