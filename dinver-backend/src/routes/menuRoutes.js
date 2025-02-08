const express = require('express');
const menuController = require('../controllers/menuController');
const {
  checkAdmin,
  authenticateToken,
} = require('../middleware/roleMiddleware');
const multer = require('multer');

const router = express.Router();
const upload = multer();

/**
 * @swagger
 * /categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Menu]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category created successfully
 *       500:
 *         description: Failed to create category
 */
router.post(
  '/categories',
  authenticateToken,
  checkAdmin,
  menuController.createCategory,
);

/**
 * @swagger
 * /categories/{id}:
 *   put:
 *     summary: Update an existing category
 *     tags: [Menu]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the category to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       404:
 *         description: Category not found
 *       500:
 *         description: Failed to update category
 */
router.put(
  '/categories/:id',
  authenticateToken,
  checkAdmin,
  menuController.updateCategory,
);

/**
 * @swagger
 * /categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     tags: [Menu]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the category to delete
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Category deleted successfully
 *       404:
 *         description: Category not found
 *       500:
 *         description: Failed to delete category
 */
router.delete(
  '/categories/:id',
  authenticateToken,
  checkAdmin,
  menuController.deleteCategory,
);

/**
 * @swagger
 * /menuItems:
 *   post:
 *     summary: Create a new menu item
 *     tags: [Menu]
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
 *               restaurantId:
 *                 type: string
 *               categoryId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Menu item created successfully
 *       500:
 *         description: Failed to create menu item
 */
router.post(
  '/menuItems',
  authenticateToken,
  checkAdmin,
  upload.single('imageFile'),
  menuController.createMenuItem,
);

/**
 * @swagger
 * /menuItems/{id}:
 *   put:
 *     summary: Update an existing menu item
 *     tags: [Menu]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the menu item to update
 *         schema:
 *           type: string
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
 *               categoryId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Menu item updated successfully
 *       404:
 *         description: Menu item not found
 *       500:
 *         description: Failed to update menu item
 */
router.put(
  '/menuItems/:id',
  authenticateToken,
  checkAdmin,
  upload.single('imageFile'),
  menuController.updateMenuItem,
);

/**
 * @swagger
 * /menuItems/{id}:
 *   delete:
 *     summary: Delete a menu item
 *     tags: [Menu]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the menu item to delete
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Menu item deleted successfully
 *       404:
 *         description: Menu item not found
 *       500:
 *         description: Failed to delete menu item
 */
router.delete(
  '/menuItems/:id',
  authenticateToken,
  checkAdmin,
  menuController.deleteMenuItem,
);

// New routes for fetching menu items and categories
router.get(
  '/menuItems/:restaurantId',
  authenticateToken,
  checkAdmin,
  menuController.getMenuItems,
);
router.get(
  '/categories/:restaurantId',
  authenticateToken,
  checkAdmin,
  menuController.getCategoryItems,
);

router.get(
  '/ingredients',
  authenticateToken,
  checkAdmin,
  menuController.getAllIngredients,
);

router.get(
  '/allergens',
  authenticateToken,
  checkAdmin,
  menuController.getAllAllergens,
);

router.put(
  '/categories-order',
  authenticateToken,
  checkAdmin,
  menuController.updateCategoryOrder,
);

router.put(
  '/menuItems-order',
  authenticateToken,
  checkAdmin,
  menuController.updateItemOrder,
);

module.exports = router;
