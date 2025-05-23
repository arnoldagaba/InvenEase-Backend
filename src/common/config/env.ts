import { z } from "zod";
import "dotenv/config";

/**
 * Define and validate environment variables schema
 */
const envSchema = z.object({
    //Server
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(["development", "production"]).default("development"),

    // Database
    DATABASE_URL: z.string(),

    // JWTs
    JWT_SECRET: z.string(),
    ACCESS_SECRET: z.string(),
    ACCESS_EXPIRES_IN: z.string().default("15m"),
    REFRESH_SECRET: z.string(),
    REFRESH_EXPIRES_IN: z.string().default("7d"),
    EMAIL_SECRET: z.string(),
    EMAIL_EXPIRES_IN: z.string().default("15m"),
    PASSWORD_SECRET: z.string(),
    PASSWORD_RESET_EXPIRES_IN: z.string().default("15m"),

    // Frontend
    FRONTEND_URL: z.string(),

    // Email
    EMAIL_HOST: z.string(),
    EMAIL_PORT: z.string(),
    EMAIL_USER: z.string(),
    EMAIL_PASS: z.string(),
    EMAIL_FROM_NAME: z.string(),
    EMAIL_FROM_ADDRESS: z.string(),

    // Security
    MAX_LOGIN_ATTEMPTS: z.coerce.number().default(5),
    LOGIN_ATTEMPT_WINDOW: z.string().default("15m"),
    ACCOUNT_LOCKOUT_DURATION: z.string().default("30m"),
    SESSION_MAX_AGE: z.string().default("24h"),
    MAX_CONCURRENT_SESSIONS: z.coerce.number().default(5),
    TOKEN_ROTATION_THRESHOLD: z.coerce.number().default(50),

    // Monitoring
    LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
    ENABLE_AUDIT_LOGS: z.coerce.boolean().default(true),
    ENABLE_SECURITY_LOGS: z.coerce.boolean().default(true),
    SUSPICIOUS_ACTIVITY_THRESHOLD: z.coerce.number().default(3),

    // Rate Limiting
    RATE_LIMIT_WINDOW: z.string().default("15m"),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
    API_RATE_LIMIT_WINDOW: z.string().default("1h"),
    API_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(1000),

    // Session Management
    SESSION_CLEANUP_INTERVAL: z.string().default("1h"),
    INACTIVE_SESSION_TIMEOUT: z.string().default("30m"),
});

/**
 * Parse and validate environment variables
 */
const envVars = envSchema.safeParse(process.env);
if (!envVars.success) {
    console.error("❌ Invalid environment variables:", envVars.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
}

/**
 * Define the configuration object
 */
const config = {
    server: {
        port: envVars.data.PORT,
        environment: envVars.data.NODE_ENV,
    },
    database: {
        url: envVars.data.DATABASE_URL,
    },
    jwt: {
        socket_secret: envVars.data.JWT_SECRET,
        accessSecret: envVars.data.ACCESS_SECRET,
        accessExpiresIn: envVars.data.ACCESS_EXPIRES_IN,
        refreshSecret: envVars.data.REFRESH_SECRET,
        refreshExpiresIn: envVars.data.REFRESH_EXPIRES_IN,
        emailSecret: envVars.data.EMAIL_SECRET,
        emailExpiresIn: envVars.data.EMAIL_EXPIRES_IN,
        passwordSecret: envVars.data.PASSWORD_SECRET,
        passwordResetExpiresIn: envVars.data.PASSWORD_RESET_EXPIRES_IN,
    },
    frontend: {
        url: envVars.data.FRONTEND_URL,
    },
    email: {
        host: envVars.data.EMAIL_HOST,
        port: Number(envVars.data.EMAIL_PORT),
        user: envVars.data.EMAIL_USER,
        password: envVars.data.EMAIL_PASS,
        fromName: envVars.data.EMAIL_FROM_NAME,
        fromAddress: envVars.data.EMAIL_FROM_ADDRESS,
    },
    security: {
        maxLoginAttempts: envVars.data.MAX_LOGIN_ATTEMPTS,
        loginAttemptWindow: envVars.data.LOGIN_ATTEMPT_WINDOW,
        accountLockoutDuration: envVars.data.ACCOUNT_LOCKOUT_DURATION,
        sessionMaxAge: envVars.data.SESSION_MAX_AGE,
        maxConcurrentSessions: envVars.data.MAX_CONCURRENT_SESSIONS,
        tokenRotationThreshold: envVars.data.TOKEN_ROTATION_THRESHOLD,
    },
    monitoring: {
        logLevel: envVars.data.LOG_LEVEL,
        enableAuditLogs: envVars.data.ENABLE_AUDIT_LOGS,
        enableSecurityLogs: envVars.data.ENABLE_SECURITY_LOGS,
        suspiciousActivityThreshold: envVars.data.SUSPICIOUS_ACTIVITY_THRESHOLD,
    },
    rateLimit: {
        window: envVars.data.RATE_LIMIT_WINDOW,
        maxRequests: envVars.data.RATE_LIMIT_MAX_REQUESTS,
        apiWindow: envVars.data.API_RATE_LIMIT_WINDOW,
        apiMaxRequests: envVars.data.API_RATE_LIMIT_MAX_REQUESTS,
    },
    session: {
        cleanupInterval: envVars.data.SESSION_CLEANUP_INTERVAL,
        inactiveTimeout: envVars.data.INACTIVE_SESSION_TIMEOUT,
    },
};

export default config;
