const express = require('express');
const { body } = require('express-validator');
const waitListController = require('../../controllers/waitListController');
const { landingApiKeyAuth } = require('../../middleware/roleMiddleware');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiter: max 5 requests per minute per IP za wait list
const waitListLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: {
    success: false,
    message: 'Previše zahtjeva. Molimo pokušajte ponovno za minutu.',
  },
});

// Validacija za korisničku prijavu
const userValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email mora biti valjan'),
  body('city')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Grad mora imati između 2 i 100 karaktera'),
];

// Validacija za restoransku prijavu
const restaurantValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email mora biti valjan'),
  body('city')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Grad mora imati između 2 i 100 karaktera'),
  body('restaurantName')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Ime restorana mora imati između 2 i 200 karaktera'),
];

// Rute za prijavu korisnika
router.post(
  '/user',
  waitListLimiter,
  landingApiKeyAuth,
  userValidation,
  waitListController.addUserToWaitList,
);

// Rute za prijavu restorana
router.post(
  '/restaurant',
  waitListLimiter,
  landingApiKeyAuth,
  restaurantValidation,
  waitListController.addRestaurantToWaitList,
);

module.exports = router;
