const express = require('express');
const favoriteController = require('../../controllers/favoriteController');
const { appApiKeyAuth } = require('../../middleware/roleMiddleware');

const router = express.Router();

// Dohvati sve favorite za korisnika
router.get('/favorites', appApiKeyAuth, favoriteController.getUserFavorites);

// Dodaj u favorite
router.post('/favorites', favoriteController.addToFavorites);

// Ukloni iz favorita
router.delete(
  '/favorites/:restaurantId',
  appApiKeyAuth,
  favoriteController.removeFromFavorites,
);

// Provjeri je li restoran u favoritima
router.get(
  '/favorites/:restaurantId/check',
  appApiKeyAuth,
  favoriteController.checkIsFavorite,
);

module.exports = router;

/**
 * @swagger
 * /api/app/favorites:
 *   get:
 *     tags:
 *       - Favorites
 *     summary: Get user's favorite restaurants
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's favorite restaurants
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *
 *   post:
 *     tags:
 *       - Favorites
 *     summary: Add restaurant to favorites
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               restaurantId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Restaurant added to favorites
 *       400:
 *         description: Restaurant already in favorites
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *
 * /api/app/favorites/{restaurantId}:
 *   delete:
 *     tags:
 *       - Favorites
 *     summary: Remove restaurant from favorites
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Restaurant removed from favorites
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Restaurant not found in favorites
 *       500:
 *         description: Server error
 *
 * /api/app/favorites/{restaurantId}/check:
 *   get:
 *     tags:
 *       - Favorites
 *     summary: Check if restaurant is in user's favorites
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Favorite status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isFavorite:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
