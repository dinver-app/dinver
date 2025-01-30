const express = require('express');
const restaurantController = require('../controllers/restaurantController');
const {
  checkAdmin,
  authenticateToken,
} = require('../middleware/roleMiddleware');
const upload = require('../../utils/uploadMiddleware');

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
router.get('/', authenticateToken, restaurantController.getAllRestaurants);

/**
 * @swagger
 * /restaurants/{slug}:
 *   get:
 *     summary: Get restaurant details by slug
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: The restaurant slug
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
router.get('/:slug', restaurantController.getRestaurantDetails);

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
router.put(
  '/:id',
  (req, res, next) => {
    console.log(req.body);
    console.log(req.file);
    next();
  },
  upload.single('thumbnail'),
  authenticateToken,
  checkAdmin,
  restaurantController.updateRestaurant,
);

/**
 * @swagger
 * /restaurants/{id}/working-hours:
 *   put:
 *     summary: Update restaurant working hours
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
 *               opening_hours:
 *                 type: object
 *                 description: The opening hours of the restaurant
 *     responses:
 *       200:
 *         description: Working hours updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 restaurant:
 *                   type: object
 *       404:
 *         description: Restaurant not found
 *       500:
 *         description: An error occurred while updating working hours
 */
router.put(
  '/:id/working-hours',
  authenticateToken,
  checkAdmin,
  restaurantController.updateWorkingHours,
);

/**
 * @swagger
 * /restaurants:
 *   post:
 *     summary: Add a new restaurant
 *     tags: [Restaurants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the restaurant
 *               address:
 *                 type: string
 *                 description: The address of the restaurant
 *     responses:
 *       201:
 *         description: Restaurant added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 restaurant:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     address:
 *                       type: string
 *       400:
 *         description: Name and address are required
 *       500:
 *         description: An error occurred while adding the restaurant
 */
router.post('/', authenticateToken, restaurantController.addRestaurant);

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
router.get(
  '/food-types',
  authenticateToken,
  restaurantController.getAllFoodTypes,
);

module.exports = router;
