import ms, { StringValue } from "ms";
import config from "./env.js";

type SameSite = "strict" | "lax" | "none" | undefined;

const authConfig = {
    // JWT settings
    jwt: {
        // Access token configuration
        access: {
            secret: config.jwt.accessSecret,
            expiresIn: config.jwt.accessExpiresIn,
            cookieName: "access_token",
            cookieMaxAge: ms(config.jwt.accessExpiresIn as StringValue),
            path: "/",
        },
        // Refresh token configuration
        refresh: {
            secret: config.jwt.refreshSecret,
            expiresIn: config.jwt.refreshExpiresIn,
            cookieName: "refresh_token",
            cookieMaxAge: ms(config.jwt.refreshExpiresIn as StringValue),
            path: "/auth/refresh-token",
        },
    },
    // Cookie settings
    cookie: {
        httpOnly: true,
        secure: config.server.environment === "production",
        sameSite:
            config.server.environment === "production"
                ? "strict"
                : ("lax" as SameSite),
    },
    // Password reset token settings
    passwordReset: {
        expiresIn: config.jwt.passwordResetExpiresIn,
    },
    // Email verification token settings
    emailVerification: {
        expiresIn: config.jwt.emailExpiresIn,
    },
    // Rate limiting
    rateLimit: {
        loginWindow: 15 * 60 * 1000, // 15 minutes
        loginMaxRequests: 5, // 5 attempts in 15 minutes
        passwordResetWindow: 60 * 60 * 1000, // 1 hour
        passwordResetMaxRequests: 3, // 3 attempts in 1 hour
    },
};

export default authConfig;
