import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Role, TokenType } from "../../generated/prisma/client.ts";
import { extractToken, verifyToken } from "../config/jwt.ts";
import prisma from "../config/prisma.ts";
import { AppError } from "../utils/errorHandler.ts";
import logger from "../utils/logger.ts";

/**
 * Authentication middleware to protect routes.
 * Verifies JWT token and attaches user data to request
 */
export const authenticate = async (
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Extract token from Authorization header or cookies
        const token = extractToken(req);
        if (!token) {
            return next(
                new AppError(
                    "Authentication required",
                    StatusCodes.UNAUTHORIZED
                )
            );
        }

        // Verify the token
        const decoded = verifyToken(token, TokenType.ACCESS);

        // Check if token type is correct
        if (decoded.type !== TokenType.ACCESS) {
            return next(
                new AppError("Invalid token type", StatusCodes.UNAUTHORIZED)
            );
        }

        // If token contains an ID, verify it exists in the database and hasn't been invalidated
        if (decoded.tokenId) {
            const tokenRecord = await prisma.token.findUnique({
                where: { id: decoded.tokenId },
            });

            if (!tokenRecord || tokenRecord.invalidated) {
                return next(
                    new AppError(
                        "Token has been revoked",
                        StatusCodes.UNAUTHORIZED
                    )
                );
            }

            // Update last used timestamp
            await prisma.token.update({
                where: { id: decoded.tokenId },
                data: { lastUsed: new Date() },
            });
        }

        // Get user from database to ensure they exist and are active
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
        });

        // Check if user exists and is active
        if (!user || !user.isActive) {
            return next(
                new AppError(
                    "User not found or inactive",
                    StatusCodes.UNAUTHORIZED
                )
            );
        }

        // Attach user data to request
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            tokenId: decoded.tokenId,
        };

        // Update user's last login time (periodically, not on every request)
        // Only update once per hour to prevent excessive database writes
        const ONE_HOUR = 60 * 60 * 1000;
        if (
            !user.lastLogin ||
            Date.now() - user.lastLogin.getTime() > ONE_HOUR
        ) {
            await prisma.user.update({
                where: { id: user.id },
                data: { lastLogin: new Date() },
            });
        }

        next();
    } catch (error) {
        logger.debug(
            `Authentication error: ${
                error instanceof Error ? error.message : "Unknown error"
            }`
        );

        // Handle specific JWT errors
        if (error instanceof Error) {
            if (error.message === "Token expired") {
                return next(
                    new AppError(
                        "Session expired, please login again",
                        StatusCodes.UNAUTHORIZED
                    )
                );
            } else if (error.message === "Invalid token") {
                return next(
                    new AppError(
                        "Invalid authentication token",
                        StatusCodes.UNAUTHORIZED
                    )
                );
            }
        }

        next(new AppError("Authentication failed", StatusCodes.UNAUTHORIZED));
    }
};

/**
 * Authorization middleware to restrict access based on user roles
 * Must be used after the authenticate middleware
 *
 * @param allowedRoles - Array of roles allowed to access the route
 */
export const authorize = (allowedRoles: Role[]) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        // Check if user exists (should be attached by authenticate middleware)
        if (!req.user) {
            return next(
                new AppError(
                    "Authentication required",
                    StatusCodes.UNAUTHORIZED
                )
            );
        }

        // Check if user's role is in the allowed roles list
        if (!allowedRoles.includes(req.user.role)) {
            return next(
                new AppError("Insufficient permissions", StatusCodes.FORBIDDEN)
            );
        }

        next();
    };
};

export default { authenticate, authorize };
