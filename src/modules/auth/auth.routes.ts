import { Router } from "express";
import {
    changePassword,
    forgotPassword,
    login,
    logout,
    refreshToken,
    register,
    resetPassword,
    verifyEmail,
    getUserSessions,
    invalidateSession,
    invalidateOtherSessions,
} from "./auth.controller.ts";
import validateRequest from "../../common/middleware/validation.middleware.ts";
import {
    changePasswordSchema,
    forgotPasswordSchema,
    loginSchema,
    logoutSchema,
    registerSchema,
    resetPasswordSchema,
    verifyEmailSchema,
    sessionIdSchema,
} from "./auth.validators.ts";
import { authenticate } from "../../common/middleware/auth.middleware.ts";

const router: Router = Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and authorization endpoints
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user
 *     description: Create a new user account with email verification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [ADMIN, MANAGER, STAFF]
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input data
 *       409:
 *         description: Email already exists
 */
router.post("/register", validateRequest(registerSchema, "body"), register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login user
 *     description: Authenticate user and return JWT tokens
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
 *               password:
 *                 type: string
 *                 format: password
 *               rememberMe:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               description: JWT tokens in cookies
 *       401:
 *         description: Invalid credentials
 *       423:
 *         description: Account locked
 */
router.post("/login", validateRequest(loginSchema, "body"), login);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Request password reset
 *     description: Send password reset email to user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       404:
 *         description: User not found
 */
router.post("/forgot-password", validateRequest(forgotPasswordSchema, "body"), forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Reset password
 *     description: Reset password using token from email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
router.post("/reset-password", validateRequest(resetPasswordSchema, "body"), resetPassword);

/**
 * @swagger
 * /api/auth/verify-email:
 *   get:
 *     tags: [Authentication]
 *     summary: Verify email address
 *     description: Verify user's email using token
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
router.get("/verify-email", validateRequest(verifyEmailSchema, "query"), verifyEmail);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh access token
 *     description: Get new access token using refresh token
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               description: New JWT tokens in cookies
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post("/refresh-token", authenticate, refreshToken);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout user
 *     description: Invalidate current session and clear tokens
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               allDevices:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/logout", authenticate, validateRequest(logoutSchema, "body"), logout);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Change password
 *     description: Change user's password
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Invalid current password
 */
router.post(
    "/change-password",
    authenticate,
    validateRequest(changePasswordSchema, "body"),
    changePassword
);

/**
 * @swagger
 * /api/auth/sessions:
 *   get:
 *     tags: [Authentication]
 *     summary: Get user sessions
 *     description: Get list of active sessions for current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active sessions
 *       401:
 *         description: Unauthorized
 */
router.get("/sessions", authenticate, getUserSessions);

/**
 * @swagger
 * /api/auth/sessions/{sessionId}:
 *   delete:
 *     tags: [Authentication]
 *     summary: Invalidate specific session
 *     description: Invalidate a specific session for current user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session invalidated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Session not found
 */
router.delete(
    "/sessions/:sessionId",
    authenticate,
    validateRequest(sessionIdSchema, "params"),
    invalidateSession
);

/**
 * @swagger
 * /api/auth/sessions:
 *   delete:
 *     tags: [Authentication]
 *     summary: Invalidate other sessions
 *     description: Invalidate all other sessions except current one
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Other sessions invalidated successfully
 *       401:
 *         description: Unauthorized
 */
router.delete("/sessions", authenticate, invalidateOtherSessions);

export default router;
