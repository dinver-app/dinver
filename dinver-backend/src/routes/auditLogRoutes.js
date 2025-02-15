const express = require('express');
const auditLogController = require('../controllers/auditLogController');
const { authenticateToken } = require('../middleware/roleMiddleware');

const router = express.Router();

/**
 * @swagger
 * /audit-logs:
 *   get:
 *     summary: Retrieve a list of all audit logs
 *     tags: [AuditLogs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of audit logs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   userId:
 *                     type: string
 *                   restaurantId:
 *                     type: string
 *                   action:
 *                     type: string
 *                   entity:
 *                     type: string
 *                   entityId:
 *                     type: string
 *                   changes:
 *                     type: object
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Server error
 */
router.get('/', authenticateToken, auditLogController.getAuditLogs);

/**
 * @swagger
 * /audit-logs/restaurant/{restaurantId}:
 *   get:
 *     summary: Retrieve a list of audit logs for a specific restaurant
 *     tags: [AuditLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the restaurant
 *     responses:
 *       200:
 *         description: A list of audit logs for the specified restaurant
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   userId:
 *                     type: string
 *                   restaurantId:
 *                     type: string
 *                   action:
 *                     type: string
 *                   entity:
 *                     type: string
 *                   entityId:
 *                     type: string
 *                   changes:
 *                     type: object
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Server error
 */
router.get(
  '/restaurant/:restaurantId',
  authenticateToken,
  auditLogController.getAuditLogsForRestaurant,
);

module.exports = router;
