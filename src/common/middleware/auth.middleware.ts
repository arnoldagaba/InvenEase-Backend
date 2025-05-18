import { Request, Response, NextFunction, RequestHandler } from "express";
import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { Role } from "../../generated/prisma/client.ts";
import authConfig from "../config/cookie.ts";
import prisma from "../config/prisma.ts";
import { AppError } from "../utils/errorHandler.ts";
import { TokenPayload } from "../types/auth.ts";

/**
 * Middleware to authenticate user by JWT token
 * Verifies the JWT token from cookies or authorization header
 */
export const authenticate: RequestHandler = asyncHandler(
    async (req: Request, _res: Response, next: NextFunction) => {
        let token: string | undefined;

        // Check for token in cookies first (preferred method)
        token = req.cookies[authConfig.jwt.access.cookieName];

        // If not in cookies, check authorization header (for API usage)
        if (!token && req.headers.authorization?.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            throw new AppError("Not authorized, no token provided", StatusCodes.UNAUTHORIZED);
        }

        try {
            // Verify token
            const decoded = jwt.verify(
                token,
                authConfig.jwt.access.secret
            ) as TokenPayload;

            // Check if token type is correct
            if (decoded.type !== "access") {
                throw new AppError("Invalid token type", StatusCodes.UNAUTHORIZED);
            }

            // Check if user exists in database
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
            });

            if (!user) {
                throw new AppError("User not found", StatusCodes.UNAUTHORIZED);
            }

            // Check if token is still valid in database
            const tokenRecord = await prisma.token.findFirst({
                where: {
                    userId: decoded.userId,
                    token,
                    type: "ACCESS",
                    invalidated: false,
                    expiresAt: {
                        gt: new Date(),
                    },
                },
            });

            if (!tokenRecord) {
                throw new AppError("Token invalid or expired", StatusCodes.UNAUTHORIZED);
            }

            // Update token last used timestamp
            await prisma.token.update({
                where: { id: tokenRecord.id },
                data: { lastUsed: new Date() },
            });

            // Add user info to request object
            req.user = {
                id: decoded.userId,
                email: decoded.email,
                role: decoded.role,
            };

            next();
        } catch (error) {
            // Handle token errors
            if (error instanceof Error) {
                if (
                    error.name === "JsonWebTokenError" ||
                    error.name === "TokenExpiredError"
                ) {
                    throw new AppError("Not authorized, token failed", StatusCodes.UNAUTHORIZED);
                }
            }
            throw error;
        }
    }
);

/**
 * Middleware to authorize user based on role
 * @param allowedRoles - Array of roles that are allowed to access the resource
 */
export const authorize = (allowedRoles: Role[]) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        if (!req.user) {
            throw new AppError("Not authenticated", StatusCodes.UNAUTHORIZED);
        }

        if (!allowedRoles.includes(req.user.role)) {
            throw new AppError("Not authorized to access this resource", StatusCodes.FORBIDDEN);
        }

        next();
    };
};

/**
 * Middleware to check if refresh token is valid
 * Used for token refresh endpoint
 */
export const validateRefreshToken: RequestHandler = asyncHandler(
    async (req: Request, _res: Response, next: NextFunction) => {
        let refreshToken: string | undefined;

        // Check for token in cookies first
        refreshToken = req.cookies[authConfig.jwt.refresh.cookieName];

        // If not in cookies, check request body
        if (!refreshToken && req.body.refreshToken) {
            refreshToken = req.body.refreshToken;
        }

        if (!refreshToken) {
            throw new AppError("No refresh token provided", StatusCodes.UNAUTHORIZED);
        }

        try {
            // Verify token
            const decoded = jwt.verify(
                refreshToken,
                authConfig.jwt.refresh.secret
            ) as TokenPayload;

            // Check if token type is correct
            if (decoded.type !== "refresh") {
                throw new AppError("Invalid token type", StatusCodes.UNAUTHORIZED);
            }

            // Check if token is still valid in database
            const tokenRecord = await prisma.token.findFirst({
                where: {
                    userId: decoded.userId,
                    token: refreshToken,
                    type: "REFRESH",
                    invalidated: false,
                    expiresAt: {
                        gt: new Date(),
                    },
                },
                include: {
                    user: true,
                },
            });

            if (!tokenRecord) {
                throw new AppError("Refresh token invalid or expired", StatusCodes.UNAUTHORIZED);
            }

            // Add user info to request
            req.user = {
                id: tokenRecord.user.id,
                email: tokenRecord.user.email,
                role: tokenRecord.user.role,
            };

            // Store refresh token for later use in controller
            req.body.validRefreshToken = refreshToken;

            next();
        } catch (error) {
            // Handle token errors
            if (error instanceof Error) {
                if (
                    error.name === "JsonWebTokenError" ||
                    error.name === "TokenExpiredError"
                ) {
                    throw new AppError("Invalid refresh token", StatusCodes.UNAUTHORIZED);
                }
            }
            throw error;
        }
    }
);
