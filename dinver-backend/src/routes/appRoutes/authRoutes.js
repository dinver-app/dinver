/**
 * @swagger
 * /api/app/auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Login user
 *     description: Authenticate a user and return JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "yourpassword123"
 *     responses:
 *       200:
 *         description: Successfully authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 *
 * /api/app/auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register new user
 *     description: Create a new user account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "yourpassword123"
 *               firstName:
 *                 type: string
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 example: "Doe"
 *     responses:
 *       201:
 *         description: User successfully created
 *       400:
 *         description: Invalid input or email already exists
 *       500:
 *         description: Server error
 *
 * /api/app/auth/logout:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Logout user
 *     description: Logout the current user and invalidate token
 *     responses:
 *       200:
 *         description: Successfully logged out
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 *
 * /api/app/auth/verify-email:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Request email verification
 *     description: Send verification email to user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Verification email sent
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 *
 * /api/app/auth/verify-email/{token}:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Verify email with token
 *     description: Verify user's email using the token sent to their email
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 *       500:
 *         description: Server error
 *
 * /api/app/auth/verify-phone:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Request phone verification
 *     description: Send verification code via SMS
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+385991234567"
 *     responses:
 *       200:
 *         description: Verification code sent
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 *
 * /api/app/auth/verify-phone/confirm:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Verify phone with code
 *     description: Verify user's phone number using the SMS code
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Phone verified successfully
 *       400:
 *         description: Invalid or expired code
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */

const express = require('express');
const authController = require('../../controllers/authController');
const {
  appAuthenticateToken,
  appApiKeyAuth,
} = require('../../middleware/roleMiddleware');

const router = express.Router();

router.post('/auth/login', authController.login);

router.post('/auth/register', authController.register);

router.get('/auth/logout', authController.logout);

router.get('/auth/check-auth', authController.checkAuth);

router.post('/auth/social-login', authController.socialLogin);

// Verifikacijske rute
router.post(
  '/auth/verify-email',
  appApiKeyAuth,
  appAuthenticateToken,
  authController.requestEmailVerification,
);
router.get('/auth/verify-email/:token', authController.verifyEmail);
router.post(
  '/auth/verify-phone',
  appApiKeyAuth,
  appAuthenticateToken,
  authController.requestPhoneVerification,
);
router.post(
  '/auth/verify-phone/confirm',
  appApiKeyAuth,
  appAuthenticateToken,
  authController.verifyPhone,
);

module.exports = router;
