const express = require('express');
const drinkController = require('../../controllers/drinkController');
const {
  checkAdmin,
  adminAuthenticateToken,
} = require('../../middleware/roleMiddleware');
const multer = require('multer');

const router = express.Router();
const upload = multer();
router.get(
  '/drinks/categories/:restaurantId',
  adminAuthenticateToken,
  checkAdmin,
  drinkController.getDrinkCategories,
);

router.post(
  '/drinks/categories',
  adminAuthenticateToken,
  checkAdmin,
  drinkController.createDrinkCategory,
);

router.put(
  '/drinks/categories/:id',
  adminAuthenticateToken,
  checkAdmin,
  drinkController.updateDrinkCategory,
);

router.delete(
  '/drinks/categories/:id',
  adminAuthenticateToken,
  checkAdmin,
  drinkController.deleteDrinkCategory,
);

router.get(
  '/drinks/drinkItems/:restaurantId',
  adminAuthenticateToken,
  checkAdmin,
  drinkController.getDrinkItems,
);

router.post(
  '/drinks/drinkItems',
  adminAuthenticateToken,
  checkAdmin,
  upload.single('imageFile'),
  drinkController.createDrinkItem,
);

router.put(
  '/drinks/drinkItems/:id',
  adminAuthenticateToken,
  checkAdmin,
  upload.single('imageFile'),
  drinkController.updateDrinkItem,
);

router.delete(
  '/drinks/drinkItems/:id',
  adminAuthenticateToken,
  checkAdmin,
  drinkController.deleteDrinkItem,
);

router.put(
  '/drinks/categories-order',
  adminAuthenticateToken,
  checkAdmin,
  drinkController.updateDrinkCategoryOrder,
);

router.put(
  '/drinks/drinkItems-order',
  adminAuthenticateToken,
  checkAdmin,
  drinkController.updateDrinkItemOrder,
);

module.exports = router;
