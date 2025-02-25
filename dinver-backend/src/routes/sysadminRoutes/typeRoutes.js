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

module.exports = router;
