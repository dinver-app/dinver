const express = require('express');
const restaurantController = require('../../controllers/restaurantController');
const { appApiKeyAuth } = require('../../middleware/roleMiddleware');

const router = express.Router();

router.get('/restaurants', appApiKeyAuth, restaurantController.getRestaurants);

router.get(
  '/restaurants/all',
  appApiKeyAuth,
  restaurantController.getAllRestaurants,
);

router.get(
  '/restaurants/all-with-details',
  appApiKeyAuth,
  restaurantController.getAllRestaurantsWithDetails,
);

router.get(
  '/restaurants/sample',
  // appApiKeyAuth,
  restaurantController.getSampleRestaurants,
);

module.exports = router;

/**
 * @swagger
 * /api/app/restaurants/sample:
 *   get:
 *     tags:
 *       - Restaurants
 *     summary: Get sample restaurants
 *     description: Retrieve a random sample of maximum 50 restaurants with pagination and search functionality
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for filtering restaurants by name or address
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *           format: float
 *         description: User's current latitude for distance calculation
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *           format: float
 *         description: User's current longitude for distance calculation
 *     responses:
 *       200:
 *         description: List of sample restaurants
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalRestaurants:
 *                   type: integer
 *                   description: Total number of restaurants in the sample
 *                 totalPages:
 *                   type: integer
 *                   description: Total number of pages (max 3)
 *                 currentPage:
 *                   type: integer
 *                   description: Current page number
 *                 restaurants:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       address:
 *                         type: string
 *                       latitude:
 *                         type: number
 *                         format: float
 *                       longitude:
 *                         type: number
 *                         format: float
 *                       rating:
 *                         type: number
 *                         format: float
 *                       user_ratings_total:
 *                         type: integer
 *                       price_level:
 *                         type: integer
 *                       opening_hours:
 *                         type: object
 *                       icon_url:
 *                         type: string
 *                         description: Fixed restaurant image URL
 *                       slug:
 *                         type: string
 *                       isClaimed:
 *                         type: boolean
 *                       email:
 *                         type: string
 *                       isOpen:
 *                         type: boolean
 *                       reviewRating:
 *                         type: number
 *                         format: float
 *                         nullable: true
 *                       distance:
 *                         type: number
 *                         format: float
 *                         description: Distance in kilometers from user's location
 *                         nullable: true
 *       400:
 *         description: Bad Request - Invalid coordinates or page number exceeds maximum
 *       500:
 *         description: Server error
 */
