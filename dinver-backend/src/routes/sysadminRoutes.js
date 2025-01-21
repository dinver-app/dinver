const express = require('express');
const sysadminController = require('../controllers/sysadminController');
const {
  checkSysadmin,
  authenticateToken,
} = require('../middleware/roleMiddleware');

const router = express.Router();

/**
 * @swagger
 * /organizations:
 *   post:
 *     summary: Create a new organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the organization
 *     responses:
 *       201:
 *         description: Organization created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *       403:
 *         description: Access denied. Superadmin only.
 */
router.post(
  '/organizations',
  authenticateToken,
  sysadminController.createOrganization,
);

/**
 * @swagger
 * /organizations/{id}:
 *   put:
 *     summary: Update an organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The organization ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The new name of the organization
 *     responses:
 *       200:
 *         description: Organization updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *       403:
 *         description: Access denied. Superadmin only.
 *       404:
 *         description: Organization not found
 */
router.put(
  '/organizations/:id',
  authenticateToken,
  sysadminController.updateOrganization,
);

/**
 * @swagger
 * /organizations/{id}:
 *   delete:
 *     summary: Delete an organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The organization ID
 *     responses:
 *       204:
 *         description: Organization deleted successfully
 *       403:
 *         description: Access denied. Superadmin only.
 *       404:
 *         description: Organization not found
 */
router.delete(
  '/organizations/:id',
  authenticateToken,
  sysadminController.deleteOrganization,
);

/**
 * @swagger
 * /restaurants:
 *   post:
 *     summary: Create a new restaurant
 *     tags: [Restaurants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               organizationId:
 *                 type: string
 *                 description: The ID of the organization
 *     responses:
 *       201:
 *         description: Restaurant created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 address:
 *                   type: string
 *                 organizationId:
 *                   type: string
 *       403:
 *         description: Access denied. Superadmin only.
 */
router.post(
  '/restaurants',
  authenticateToken,
  sysadminController.createRestaurant,
);

/**
 * @swagger
 * /restaurants/{id}:
 *   put:
 *     summary: Update a restaurant
 *     tags: [Restaurants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The restaurant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Restaurant updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 address:
 *                   type: string
 *       403:
 *         description: Access denied. Superadmin only.
 *       404:
 *         description: Restaurant not found
 */
router.put(
  '/restaurants/:id',
  authenticateToken,
  sysadminController.updateRestaurant,
);

/**
 * @swagger
 * /restaurants/{id}:
 *   delete:
 *     summary: Delete a restaurant
 *     tags: [Restaurants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The restaurant ID
 *     responses:
 *       204:
 *         description: Restaurant deleted successfully
 *       403:
 *         description: Access denied. Superadmin only.
 *       404:
 *         description: Restaurant not found
 */
router.delete(
  '/restaurants/:id',
  authenticateToken,
  sysadminController.deleteRestaurant,
);

/**
 * @swagger
 * /organizations/users:
 *   post:
 *     summary: Add a user to an organization
 *     tags: [User-Organization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               organizationId:
 *                 type: string
 *     responses:
 *       201:
 *         description: User added to organization successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                 organizationId:
 *                   type: string
 *       403:
 *         description: Access denied. Superadmin only.
 */
router.post(
  '/organizations/users',
  authenticateToken,
  sysadminController.addUserToOrganization,
);

/**
 * @swagger
 * /organizations/users:
 *   delete:
 *     summary: Remove a user from an organization
 *     tags: [User-Organization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               organizationId:
 *                 type: string
 *     responses:
 *       204:
 *         description: User removed from organization successfully
 *       403:
 *         description: Access denied. Superadmin only.
 *       404:
 *         description: User not found in organization
 */
router.delete(
  '/organizations/users',
  authenticateToken,
  sysadminController.removeUserFromOrganization,
);

/**
 * @swagger
 * /organizations/restaurants:
 *   post:
 *     summary: Add a restaurant to an organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               restaurantId:
 *                 type: string
 *                 description: The ID of the restaurant
 *               organizationId:
 *                 type: string
 *                 description: The ID of the organization
 *     responses:
 *       200:
 *         description: Restaurant added to organization successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       403:
 *         description: Access denied. Superadmin only.
 *       404:
 *         description: Organization or restaurant not found
 */
router.post(
  '/organizations/restaurants',
  authenticateToken,
  sysadminController.addRestaurantToOrganization,
);

/**
 * @swagger
 * /sysadmin/login:
 *   post:
 *     summary: Log in as a sysadmin
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: The sysadmin's email
 *               password:
 *                 type: string
 *                 description: The sysadmin's password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid email or password
 */
router.post('/login', checkSysadmin, sysadminController.login);

/**
 * @swagger
 * /sysadmin/logout:
 *   get:
 *     summary: Log out as a sysadmin
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.get('/sysadmin/logout', sysadminController.logout);

/**
 * @swagger
 * /sysadmins:
 *   get:
 *     summary: List all sysadmins
 *     tags: [Sysadmins]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of sysadmins
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   userId:
 *                     type: string
 *                   user:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       email:
 *                         type: string
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *       403:
 *         description: Access denied. Sysadmin only.
 */
router.get(
  '/sysadmins',
  authenticateToken,
  checkSysadmin,
  sysadminController.listSysadmins,
);

/**
 * @swagger
 * /sysadmins:
 *   post:
 *     summary: Add a user as a sysadmin
 *     tags: [Sysadmins]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The ID of the user to be added as sysadmin
 *     responses:
 *       201:
 *         description: User added as sysadmin successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *       403:
 *         description: Access denied. Sysadmin only.
 *       404:
 *         description: User not found
 */
router.post(
  '/sysadmins',
  authenticateToken,
  checkSysadmin,
  sysadminController.addSysadmin,
);

/**
 * @swagger
 * /sysadmins/{userId}:
 *   delete:
 *     summary: Remove a user from sysadmins
 *     tags: [Sysadmins]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to be removed from sysadmins
 *     responses:
 *       204:
 *         description: Sysadmin removed successfully
 *       403:
 *         description: Access denied. Sysadmin only.
 *       404:
 *         description: Sysadmin not found
 */
router.delete(
  '/sysadmins/:userId',
  authenticateToken,
  checkSysadmin,
  sysadminController.removeSysadmin,
);

module.exports = router;
