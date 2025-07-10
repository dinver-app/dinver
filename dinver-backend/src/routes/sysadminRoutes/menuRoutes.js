const express = require('express');
const menuController = require('../../controllers/menuController');
const {
  checkSysadmin,
  sysadminAuthenticateToken,
} = require('../../middleware/roleMiddleware');
const multer = require('multer');

const router = express.Router();
const upload = multer();

router.post(
  '/menu/categories',
  sysadminAuthenticateToken,
  checkSysadmin,
  menuController.createCategory,
);

router.put(
  '/menu/categories/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  menuController.updateCategory,
);

router.delete(
  '/menu/categories/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  menuController.deleteCategory,
);

router.post(
  '/menu/menuItems',
  sysadminAuthenticateToken,
  checkSysadmin,
  upload.single('imageFile'),
  menuController.createMenuItem,
);

router.put(
  '/menu/menuItems/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  upload.single('imageFile'),
  menuController.updateMenuItem,
);

router.delete(
  '/menu/menuItems/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  menuController.deleteMenuItem,
);

router.get(
  '/menu/menuItems/:restaurantId',
  sysadminAuthenticateToken,
  checkSysadmin,
  menuController.getMenuItems,
);

// Nova ruta za sysadmin - sve stavke (aktivne i neaktivne)
router.get(
  '/menu/menuItems-admin/:restaurantId',
  sysadminAuthenticateToken,
  checkSysadmin,
  menuController.getAllMenuItemsForAdmin,
);

router.get(
  '/menu/categories/:restaurantId',
  sysadminAuthenticateToken,
  checkSysadmin,
  menuController.getCategoryItems,
);

// Nova ruta za sysadmin - sve kategorije (aktivne i neaktivne)
router.get(
  '/menu/categories-admin/:restaurantId',
  sysadminAuthenticateToken,
  checkSysadmin,
  menuController.getAllCategoriesForAdmin,
);

router.get(
  '/menu/allergens',
  sysadminAuthenticateToken,
  checkSysadmin,
  menuController.getAllAllergens,
);

router.put(
  '/menu/categories-order',
  sysadminAuthenticateToken,
  checkSysadmin,
  menuController.updateCategoryOrder,
);

router.put(
  '/menu/menuItems-order',
  sysadminAuthenticateToken,
  checkSysadmin,
  menuController.updateItemOrder,
);

module.exports = router;
