const express = require('express');
const sysadminController = require('../../controllers/sysadminController');
const jsonMenuFileController = require('../../controllers/jsonMenuFileController');
const {
  checkSysadmin,
  sysadminAuthenticateToken,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

router.post(
  '/restaurants',
  sysadminAuthenticateToken,
  checkSysadmin,
  sysadminController.createRestaurant,
);

router.put(
  '/restaurants/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  sysadminController.updateRestaurant,
);

router.delete(
  '/restaurants/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  sysadminController.deleteRestaurant,
);

router.get(
  '/sysadmins',
  sysadminAuthenticateToken,
  checkSysadmin,
  sysadminController.listSysadmins,
);

router.post(
  '/sysadmins',
  sysadminAuthenticateToken,
  checkSysadmin,
  sysadminController.addSysadmin,
);

router.delete(
  '/sysadmins/:email',
  sysadminAuthenticateToken,
  checkSysadmin,
  sysadminController.removeSysadmin,
);

router.get(
  '/users',
  sysadminAuthenticateToken,
  checkSysadmin,
  sysadminController.listUsers,
);

router.delete(
  '/users',
  sysadminAuthenticateToken,
  checkSysadmin,
  sysadminController.deleteUser,
);

router.post(
  '/users',
  sysadminAuthenticateToken,
  checkSysadmin,
  sysadminController.createUser,
);

router.post(
  '/users/ban',
  sysadminAuthenticateToken,
  checkSysadmin,
  sysadminController.setUserBanStatus,
);

router.get(
  '/restaurants/:restaurantId/admins',
  sysadminAuthenticateToken,
  checkSysadmin,
  sysadminController.getRestaurantAdmins,
);

router.post(
  '/restaurants/:restaurantId/admins',
  sysadminAuthenticateToken,
  checkSysadmin,
  sysadminController.addRestaurantAdmin,
);

router.put(
  '/restaurants/:restaurantId/admins/:userId',
  sysadminAuthenticateToken,
  checkSysadmin,
  sysadminController.updateRestaurantAdmin,
);

router.delete(
  '/restaurants/:restaurantId/admins/:userId',
  sysadminAuthenticateToken,
  checkSysadmin,
  sysadminController.removeRestaurantAdmin,
);

router.patch(
  '/restaurants/:restaurantId/admins/:userId',
  sysadminAuthenticateToken,
  checkSysadmin,
  sysadminController.updateRestaurantAdminRole,
);

router.get(
  '/users/all',
  sysadminAuthenticateToken,
  checkSysadmin,
  sysadminController.listAllUsers,
);

router.get(
  '/claimed/reviews',
  sysadminAuthenticateToken,
  checkSysadmin,
  sysadminController.getAllReviewsForClaimedRestaurants,
);

// JSON Menu File Management Routes
router.get(
  '/restaurants/:restaurantId/json-files',
  sysadminAuthenticateToken,
  checkSysadmin,
  jsonMenuFileController.getRestaurantJsonFiles,
);

router.post(
  '/restaurants/:restaurantId/json-files',
  sysadminAuthenticateToken,
  checkSysadmin,
  jsonMenuFileController.createJsonMenuFile,
);

router.put(
  '/json-files/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  jsonMenuFileController.updateJsonMenuFile,
);

router.delete(
  '/json-files/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  jsonMenuFileController.deleteJsonMenuFile,
);

router.post(
  '/json-files/:id/import',
  sysadminAuthenticateToken,
  checkSysadmin,
  jsonMenuFileController.importMenuFromJsonFile,
);

module.exports = router;
