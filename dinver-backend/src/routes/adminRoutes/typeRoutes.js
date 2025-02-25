const express = require('express');
const typeController = require('../../controllers/typeController');
const {
  adminAuthenticateToken,
  checkAdmin,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

router.get(
  '/types/food-types',
  adminAuthenticateToken,
  checkAdmin,
  typeController.getAllFoodTypes,
);

router.get(
  '/types/establishment-types',
  adminAuthenticateToken,
  checkAdmin,
  typeController.getAllEstablishmentTypes,
);

router.get(
  '/types/establishment-perks',
  adminAuthenticateToken,
  checkAdmin,
  typeController.getAllEstablishmentPerks,
);

module.exports = router;
