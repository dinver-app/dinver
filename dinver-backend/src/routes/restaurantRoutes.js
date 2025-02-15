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
 *     summary: Get paginated list of restaurants with details
 *     tags: [Restaurants]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: The page number for pagination
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for filtering restaurants by name or address
 *     responses:
 *       200:
 *         description: A paginated list of restaurants
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalRestaurants:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 *                 restaurants:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       address:
 *                         type: string
 *                       latitude:
 *                         type: number
 *                       longitude:
 *                         type: number
 *                       rating:
 *                         type: number
 *                       user_ratings_total:
 *                         type: integer
 *                       price_level:
 *                         type: integer
 *                       opening_hours:
 *                         type: string
 *                       icon_url:
 *                         type: string
 *                       slug:
 *                         type: string
 *                       isOpen:
 *                         type: boolean
 *                       isClaimed:
 *                         type: boolean
 *                 totalRestaurantsCount:
 *                   type: integer
 *                 claimedRestaurantsCount:
 *                   type: integer
 */
router.get('/', authenticateToken, restaurantController.getRestaurants);

/**
 * @swagger
 * /restaurants/all:
 *   get:
 *     summary: Get all restaurants with only ID and name
 *     tags: [Restaurants]
 *     responses:
 *       200:
 *         description: A list of all restaurants with ID and name
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 */
router.get('/all', authenticateToken, restaurantController.getAllRestaurants);

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
 * /restaurants/{id}/filters:
 *   put:
 *     summary: Update filters for a restaurant
 *     tags: [Restaurants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the restaurant
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               foodTypes:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: List of food type IDs
 *               establishmentTypes:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: List of establishment type IDs
 *               establishmentPerks:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: List of establishment perk IDs
 *     responses:
 *       200:
 *         description: Filters updated successfully
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
 *                     food_types:
 *                       type: array
 *                       items:
 *                         type: integer
 *                     establishment_types:
 *                       type: array
 *                       items:
 *                         type: integer
 *                     establishment_perks:
 *                       type: array
 *                       items:
 *                         type: integer
 *       404:
 *         description: Restaurant not found
 *       500:
 *         description: An error occurred while updating filters
 */
router.put(
  '/:id/filters',
  authenticateToken,
  restaurantController.updateFilters,
);

/**
 * @swagger
 * /restaurants/{id}/images:
 *   post:
 *     summary: Add images to a restaurant
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Images added successfully
 *       400:
 *         description: No images provided
 *       404:
 *         description: Restaurant not found
 *       500:
 *         description: Failed to add images
 */
router.post(
  '/:id/images',
  authenticateToken,
  checkAdmin,
  upload.array('images'),
  restaurantController.addRestaurantImages,
);

/**
 * @swagger
 * /restaurants/{id}/images:
 *   delete:
 *     summary: Delete an image from a restaurant
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
 *               imageUrl:
 *                 type: string
 *                 description: The URL of the image to delete
 *     responses:
 *       200:
 *         description: Image deleted successfully
 *       400:
 *         description: Image not found in restaurant
 *       404:
 *         description: Restaurant not found
 *       500:
 *         description: Failed to delete image
 */
router.delete(
  '/:id/images',
  authenticateToken,
  checkAdmin,
  restaurantController.deleteRestaurantImage,
);

/**
 * @swagger
 * /restaurants/{id}/images/order:
 *   put:
 *     summary: Update the order of images for a restaurant
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
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: The reordered list of image URLs
 *     responses:
 *       200:
 *         description: Image order updated successfully
 *       404:
 *         description: Restaurant not found
 *       500:
 *         description: Failed to update image order
 */
router.put(
  '/:id/images/order',
  authenticateToken,
  checkAdmin,
  restaurantController.updateImageOrder,
);

module.exports = router;
