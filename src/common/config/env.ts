import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

/**
 * Define and validate environment variables schema
 */
const envSchema = z.object({
    //Server
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(["development", "production"]).default("development"),

    // Database
    DATABASE_URL: z.string(),
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
};

export default config;
