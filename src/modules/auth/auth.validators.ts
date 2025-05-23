import { z } from "zod";
import { Role } from "../../generated/prisma/client.ts";

/**
 * Password validation schema
 */
const passwordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(100, "Password is too long")
    .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    );

/**
 * Registration validation schema
 */
export const registerSchema = z.object({
    email: z.string().email("Invalid email address").max(255, "Email is too long"),
    password: passwordSchema,
    name: z.string().min(2, "Name must be at least 2 characters long").max(255, "Name is too long"),
    role: z.enum([Role.ADMIN, Role.MANAGER, Role.STAFF]).optional().default(Role.STAFF),
});

// Login validation schema
export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),

    password: passwordSchema,

    rememberMe: z.boolean().optional().default(false),
});

// Refresh token validation schema
export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, "Refresh token is required"),
});

// Password reset request validation schema
export const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address"),
});

// Password reset validation schema
export const resetPasswordSchema = z.object({
    token: z.string().min(1, "Reset token is required"),

    password: passwordSchema,

    confirmPassword: z.string().min(1, "Confirm password is required"),
});

// Change password validation schema
export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),

    newPassword: passwordSchema,

    confirmPassword: z.string().min(1, "Confirm password is required"),
});

// Email verification validation schema
export const verifyEmailSchema = z.object({
    token: z.string().min(1, "Verification token is required"),
});

// Logout validation schema (optional token)
export const logoutSchema = z.object({
    allDevices: z.boolean().optional().default(false),
});

/**
 * Session ID validation schema
 */
export const sessionIdSchema = z.object({
    sessionId: z.string().uuid("Invalid session ID"),
});
