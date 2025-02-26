const express = require('express');
const drinkController = require('../../controllers/drinkController');
const {
  checkSysadmin,
  sysadminAuthenticateToken,
} = require('../../middleware/roleMiddleware');
const multer = require('multer');

const router = express.Router();
const upload = multer();

router.post(
  '/drinks/categories',
  sysadminAuthenticateToken,
  checkSysadmin,
  drinkController.createDrinkCategory,
);

router.put(
  '/drinks/categories/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  drinkController.updateDrinkCategory,
);

router.delete(
  '/drinks/categories/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  drinkController.deleteDrinkCategory,
);

router.post(
  '/drinks/drinkItems',
  sysadminAuthenticateToken,
  checkSysadmin,
  upload.single('imageFile'),
  drinkController.createDrinkItem,
);

router.put(
  '/drinks/drinkItems/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  upload.single('imageFile'),
  drinkController.updateDrinkItem,
);

router.delete(
  '/drinks/drinkItems/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  drinkController.deleteDrinkItem,
);

router.get(
  '/drinks/drinkItems/:restaurantId',
  sysadminAuthenticateToken,
  checkSysadmin,
  drinkController.getDrinkItems,
);

router.get(
  '/drinks/categories/:restaurantId',
  sysadminAuthenticateToken,
  checkSysadmin,
  drinkController.getDrinkCategories,
);

router.put(
  '/drinks/categories-order',
  sysadminAuthenticateToken,
  checkSysadmin,
  drinkController.updateDrinkCategoryOrder,
);

router.put(
  '/drinks/drinkItems-order',
  sysadminAuthenticateToken,
  checkSysadmin,
  drinkController.updateDrinkItemOrder,
);

module.exports = router;
