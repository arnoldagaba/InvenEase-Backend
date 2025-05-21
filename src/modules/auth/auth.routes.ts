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
} from "./auth.validators.ts";
import { authenticate } from "../../common/middleware/auth.middleware.ts";

const router: Router = Router();

router.post("/register", validateRequest(registerSchema, "body"), register);
router.post("/login", validateRequest(loginSchema, "body"), login);
router.post(
    "/forgot-password",
    validateRequest(forgotPasswordSchema, "body"),
    forgotPassword
);
router.post(
    "/reset-password",
    validateRequest(resetPasswordSchema, "body"),
    resetPassword
);
router.get(
    "/verify-email",
    validateRequest(verifyEmailSchema, "query"),
    verifyEmail
);

// Protected Routes
router.post("/refresh-token", authenticate, refreshToken);
router.post(
    "/logout",
    authenticate,
    validateRequest(logoutSchema, "body"),
    logout
);
router.post(
    "/change-password",
    authenticate,
    validateRequest(changePasswordSchema, "body"),
    changePassword
);

export default router;
