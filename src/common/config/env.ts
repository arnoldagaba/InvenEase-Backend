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
});

/**
 * Parse and validate environment variables
 */
const envVars = envSchema.safeParse(process.env);
if (!envVars.success) {
    console.error(
        "❌ Invalid environment variables:",
        envVars.error.flatten().fieldErrors
    );
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
};

export default config;
