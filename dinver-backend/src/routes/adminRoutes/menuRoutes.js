const express = require('express');
const menuController = require('../../controllers/menuController');
const {
  checkAdmin,
  adminAuthenticateToken,
} = require('../../middleware/roleMiddleware');
const multer = require('multer');

const router = express.Router();
const upload = multer();

router.get(
  '/menu/categories/:restaurantId',
  adminAuthenticateToken,
  checkAdmin,
  menuController.getCategoryItems,
);

// Nova ruta za admin panel - sve kategorije (aktivne i neaktivne)
router.get(
  '/menu/categories-admin/:restaurantId',
  adminAuthenticateToken,
  checkAdmin,
  menuController.getAllCategoriesForAdmin,
);

router.post(
  '/menu/categories',
  adminAuthenticateToken,
  checkAdmin,
  menuController.createCategory,
);

router.put(
  '/menu/categories/:id',
  adminAuthenticateToken,
  checkAdmin,
  menuController.updateCategory,
);

router.delete(
  '/menu/categories/:id',
  adminAuthenticateToken,
  checkAdmin,
  menuController.deleteCategory,
);

router.get(
  '/menu/menuItems/:restaurantId',
  adminAuthenticateToken,
  checkAdmin,
  menuController.getMenuItems,
);

// Nova ruta za admin panel - sve stavke (aktivne i neaktivne)
router.get(
  '/menu/menuItems-admin/:restaurantId',
  adminAuthenticateToken,
  checkAdmin,
  menuController.getAllMenuItemsForAdmin,
);

router.post(
  '/menu/menuItems',
  adminAuthenticateToken,
  checkAdmin,
  upload.single('imageFile'),
  menuController.createMenuItem,
);

router.put(
  '/menu/menuItems/:id',
  adminAuthenticateToken,
  checkAdmin,
  upload.single('imageFile'),
  menuController.updateMenuItem,
);

router.delete(
  '/menu/menuItems/:id',
  adminAuthenticateToken,
  checkAdmin,
  menuController.deleteMenuItem,
);

router.get(
  '/menu/allergens',
  adminAuthenticateToken,
  checkAdmin,
  menuController.getAllAllergens,
);

router.put(
  '/menu/categories-order',
  adminAuthenticateToken,
  checkAdmin,
  menuController.updateCategoryOrder,
);

router.put(
  '/menu/menuItems-order',
  adminAuthenticateToken,
  checkAdmin,
  menuController.updateItemOrder,
);

module.exports = router;
