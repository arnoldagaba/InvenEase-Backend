import { Request } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import ms, { StringValue } from "ms";
import { StatusCodes } from "http-status-codes";
import { TokenType } from "../../generated/prisma/client.ts";
import config from "./env.ts";
import { AppError } from "../utils/errorHandler.ts";

interface JwtPayload {
    userId: string;
    email: string;
    role: string;
    tokenId?: string;
    type?: TokenType;
}

interface TokenConfig {
    secret: string;
    expiresIn: string | number;
}

// Map tokens to their configurations
const tokenConfigs: Record<TokenType, TokenConfig> = {
    [TokenType.ACCESS]: {
        secret: config.jwt.accessSecret,
        expiresIn: config.jwt.accessExpiresIn,
    },
    [TokenType.REFRESH]: {
        secret: config.jwt.refreshSecret,
        expiresIn: config.jwt.refreshExpiresIn,
    },
    [TokenType.EMAIL_VERIFICATION]: {
        secret: config.jwt.emailSecret,
        expiresIn: config.jwt.emailExpiresIn,
    },
    [TokenType.PASSWORD_RESET]: {
        secret: config.jwt.passwordSecret,
        expiresIn: config.jwt.passwordResetExpiresIn,
    },
};

/**
 * Generate a JWT token based on provided user information and token type
 */
export const generateToken = (
    payload: JwtPayload,
    tokenType: TokenType
): { token: string; expiresAt: Date } => {
    const config = tokenConfigs[tokenType];

    // Convert expiry time to milliseconds if it's a string
    const expiryMs =
        typeof config.expiresIn === "string"
            ? ms(config.expiresIn as StringValue)
            : config.expiresIn;

    // Calculate the exact expiry date
    const expiresAt = new Date(Date.now() + expiryMs);

    // Create the token
    const token = jwt.sign({ ...payload, type: tokenType }, config.secret, {
        expiresIn: config.expiresIn as SignOptions["expiresIn"],
    });

    return { token, expiresAt };
};

/**
 * Verify and decode a JWT token
 */
export const verifyToken = (
    token: string,
    tokenType: TokenType
): jwt.JwtPayload & JwtPayload => {
    try {
        const config = tokenConfigs[tokenType];
        const decoded = jwt.verify(token, config.secret) as jwt.JwtPayload &
            JwtPayload;
        return decoded;
    } catch (error: unknown) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new AppError("Token expired", StatusCodes.UNAUTHORIZED);
        } else if (error instanceof jwt.JsonWebTokenError) {
            throw new AppError("Invalid token", StatusCodes.UNAUTHORIZED);
        } else {
            throw error;
        }
    }
};

/**
 * Extract token from request headers or cookies
 */
export const extractToken = (req: Request): string | null => {
    // Try to get from authorization header
    const authHeader = req.headers?.authorization;
    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.substring(7);
    }

    // Try to get from cookies
    if (req.cookies?.accessToken) {
        return req.cookies.accessToken;
    }

    return null;
};

export default {
    generateToken,
    verifyToken,
    extractToken,
};