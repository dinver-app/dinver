const express = require('express');
const typeController = require('../../controllers/typeController');
const {
  sysadminAuthenticateToken,
  checkSysadmin,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

router.get(
  '/types/food-types',
  sysadminAuthenticateToken,
  checkSysadmin,
  typeController.getAllFoodTypes,
);

router.get(
  '/types/establishment-types',
  sysadminAuthenticateToken,
  checkSysadmin,
  typeController.getAllEstablishmentTypes,
);

router.get(
  '/types/establishment-perks',
  sysadminAuthenticateToken,
  checkSysadmin,
  typeController.getAllEstablishmentPerks,
);

router.get(
  '/types/meal-types',
  sysadminAuthenticateToken,
  checkSysadmin,
  typeController.getAllMealTypes,
);

router.get(
  '/types/price-categories',
  sysadminAuthenticateToken,
  checkSysadmin,
  typeController.getAllPriceCategories,
);

router.get(
  '/types/dietary-types',
  sysadminAuthenticateToken,
  checkSysadmin,
  typeController.getAllDietaryTypes,
);

module.exports = router;

// CRUD for types (sysadmin)
router.post(
  '/types/:type',
  sysadminAuthenticateToken,
  checkSysadmin,
  typeController.createType,
);

router.put(
  '/types/:type/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  typeController.updateType,
);

router.delete(
  '/types/:type/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  typeController.deleteType,
);

router.put(
  '/types/:type-order',
  sysadminAuthenticateToken,
  checkSysadmin,
  typeController.updateTypeOrder,
);
