const express = require('express');
const menuCategoryController = require('../controllers/menuCategoryController');
const menuItemController = require('../controllers/menuItemController');
const menuController = require('../controllers/menuController');
const { checkEditorOrAdmin } = require('../middleware/roleMiddleware');

const router = express.Router();

/**
 * @swagger
 * /restaurants/{restaurantId}/categories:
 *   post:
 *     summary: Create a new menu category for a restaurant
 *     tags: [Menu Categories]
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the restaurant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the category
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 restaurant_id:
 *                   type: string
 *       404:
 *         description: Restaurant not found
 */
router.post(
  '/restaurants/:restaurantId/categories',
  menuCategoryController.createCategory,
);

/**
 * @swagger
 * /restaurants/{restaurantId}/categories:
 *   get:
 *     summary: Get all menu categories for a restaurant
 *     tags: [Menu Categories]
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the restaurant
 *     responses:
 *       200:
 *         description: A list of categories
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
 *                   restaurant_id:
 *                     type: string
 */
router.get(
  '/restaurants/:restaurantId/categories',
  menuCategoryController.getCategories,
);

/**
 * @swagger
 * /categories/{categoryId}/items:
 *   post:
 *     summary: Create a new menu item in a category
 *     tags: [Menu Items]
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the category
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               image_url:
 *                 type: string
 *               ingredients:
 *                 type: array
 *                 items:
 *                   type: string
 *               allergens:
 *                 type: array
 *                 items:
 *                   type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Item created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 price:
 *                   type: number
 *                 category_id:
 *                   type: string
 *       404:
 *         description: Category not found
 */
router.post('/categories/:categoryId/items', menuItemController.createItem);

/**
 * @swagger
 * /categories/{categoryId}/items:
 *   get:
 *     summary: Get all menu items in a category
 *     tags: [Menu Items]
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the category
 *     responses:
 *       200:
 *         description: A list of items
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
 *                   price:
 *                     type: number
 *                   category_id:
 *                     type: string
 */
router.get('/categories/:categoryId/items', menuItemController.getItems);

/**
 * @swagger
 * /categories/{id}:
 *   put:
 *     summary: Update a menu category
 *     tags: [Menu Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The new name of the category
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *       403:
 *         description: Access denied. Only editors or organization members can perform this action.
 *       404:
 *         description: Menu category not found
 */
router.put(
  '/categories/:id',
  checkEditorOrAdmin,
  menuController.updateMenuCategory,
);

/**
 * @swagger
 * /items/{id}:
 *   put:
 *     summary: Update a menu item
 *     tags: [Menu Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               image_url:
 *                 type: string
 *               ingredients:
 *                 type: array
 *                 items:
 *                   type: string
 *               allergens:
 *                 type: array
 *                 items:
 *                   type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 price:
 *                   type: number
 *       403:
 *         description: Access denied. Only editors or organization members can perform this action.
 *       404:
 *         description: Menu item not found
 */
router.put('/items/:id', checkEditorOrAdmin, menuController.updateMenuItem);

module.exports = router;
