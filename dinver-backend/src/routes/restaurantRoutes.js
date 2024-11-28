const express = require('express');
const restaurantController = require('../controllers/restaurantController');

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

module.exports = router;
