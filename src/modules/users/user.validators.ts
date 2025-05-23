import { z } from "zod";
import { Role } from "../../generated/prisma/client.ts";

// Common validation rules
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 100;
const PHONE_REGEX = /^\+?[0-9\s-()]+$/;

/** Password validation schema */
const passwordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(100, "Password is too long")
    .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    );

/** Create user validation schema */
export const createUserSchema = z.object({
    email: z.string().email("Invalid email address").max(255, "Email is too long"),

    password: passwordSchema,

    name: z
        .string()
        .min(NAME_MIN_LENGTH, `Name must be at least ${NAME_MIN_LENGTH} characters long`)
        .max(NAME_MAX_LENGTH, `Name is too long (max ${NAME_MAX_LENGTH} characters)`),

    role: z.nativeEnum(Role).optional().default(Role.STAFF),

    phone: z
        .string()
        .regex(PHONE_REGEX, "Invalid phone number format")
        .max(20, "Phone number is too long")
        .optional(),

    isActive: z.boolean().optional().default(true),
});
export type CreateUserDto = z.infer<typeof createUserSchema>;

/** Update user validation schema */
export const updateUserSchema = z.object({
    name: z
        .string()
        .min(NAME_MIN_LENGTH, `Name must be at least ${NAME_MIN_LENGTH} characters long`)
        .max(NAME_MAX_LENGTH, `Name is too long (max ${NAME_MAX_LENGTH} characters)`)
        .optional(),

    role: z.nativeEnum(Role).optional(),

    phone: z
        .string()
        .regex(PHONE_REGEX, "Invalid phone number format")
        .max(20, "Phone number is too long")
        .optional()
        .nullable(),

    isActive: z.boolean().optional(),
});

/** Update my profile validation schema */
export const updateProfileSchema = z.object({
    name: z
        .string()
        .min(NAME_MIN_LENGTH, `Name must be at least ${NAME_MIN_LENGTH} characters long`)
        .max(NAME_MAX_LENGTH, `Name is too long (max ${NAME_MAX_LENGTH} characters)`)
        .optional(),

    phone: z
        .string()
        .regex(PHONE_REGEX, "Invalid phone number format")
        .max(20, "Phone number is too long")
        .optional()
        .nullable(),
});
export type UpdateUserDto = z.infer<typeof updateProfileSchema>;

/** Query parameters for user listing */
export const getUsersQuerySchema = z.object({
    page: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 1))
        .refine((val) => val > 0, {
            message: "Page must be a positive number",
        }),

    limit: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 10))
        .refine((val) => val > 0 && val <= 100, {
            message: "Limit must be between 1 and 100",
        }),

    role: z.nativeEnum(Role).optional(),

    search: z.string().optional(),

    sortBy: z
        .enum(["name", "email", "role", "createdAt", "lastLogin"])
        .optional()
        .default("createdAt"),

    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),

    isActive: z
        .enum(["true", "false", "all"])
        .optional()
        .default("all")
        .transform((val) => {
            if (val === "true") return true;
            if (val === "false") return false;
            return undefined;
        }),
});

// User ID parameter validation
export const userIdParamSchema = z.object({
    id: z.string().uuid("Invalid user ID format"),
});

export default {
    createUserSchema,
    updateUserSchema,
    updateProfileSchema,
    getUsersQuerySchema,
    userIdParamSchema,
};
