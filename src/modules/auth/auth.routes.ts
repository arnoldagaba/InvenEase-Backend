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

// Public Routes
router.post("/register", validateRequest(registerSchema, "body"), register);
router.post("/login", validateRequest(loginSchema, "body"), login);
router.post("/forgot-password", validateRequest(forgotPasswordSchema, "body"), forgotPassword);
router.post("/reset-password", validateRequest(resetPasswordSchema, "body"), resetPassword);
router.get("/verify-email", validateRequest(verifyEmailSchema, "query"), verifyEmail);

// Protected Routes
router.post("/refresh-token", authenticate, refreshToken);
router.post("/logout", authenticate, validateRequest(logoutSchema, "body"), logout);
router.post(
    "/change-password",
    authenticate,
    validateRequest(changePasswordSchema, "body"),
    changePassword
);

// Session Management Routes
router.get("/sessions", authenticate, getUserSessions);
router.delete(
    "/sessions/:sessionId",
    authenticate,
    validateRequest(sessionIdSchema, "params"),
    invalidateSession
);
router.delete("/sessions", authenticate, invalidateOtherSessions);

export default router;
