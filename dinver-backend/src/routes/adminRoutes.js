const express = require('express');
const adminController = require('../controllers/adminController');
const { checkAdmin } = require('../middleware/roleMiddleware');

const router = express.Router();

/**
 * @swagger
 * /restaurants/users:
 *   post:
 *     summary: Add a user to a restaurant with a specific permission
 *     tags: [Restaurant-User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               restaurantId:
 *                 type: string
 *               permission:
 *                 type: string
 *                 enum: [view, edit]
 *     responses:
 *       201:
 *         description: User added to restaurant successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                 restaurantId:
 *                   type: string
 *                 role:
 *                   type: string
 *       403:
 *         description: Access denied. Only organization admins can perform this action.
 */
router.post(
  '/restaurants/users',
  checkAdmin,
  adminController.addUserToRestaurant,
);

/**
 * @swagger
 * /restaurants/users:
 *   delete:
 *     summary: Remove a user from a restaurant
 *     tags: [Restaurant-User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               restaurantId:
 *                 type: string
 *     responses:
 *       204:
 *         description: User removed from restaurant successfully
 *       403:
 *         description: Access denied. Only organization admins can perform this action.
 *       404:
 *         description: User not found in restaurant
 */
router.delete(
  '/restaurants/users',
  checkAdmin,
  adminController.removeUserFromRestaurant,
);

module.exports = router;
