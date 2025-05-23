import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Role, TokenType } from "../../generated/prisma/client.ts";
import { extractToken, verifyToken } from "../config/jwt.ts";
import prisma from "../config/prisma.ts";
import { AppError } from "../utils/errorHandler.ts";
import logger from "../utils/logger.ts";
import { securityService } from "../services/security.service.ts";
import { loggingService } from "../services/logging.service.ts";

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
            await loggingService.logSecurityEvent(
                undefined,
                "AUTH_FAILED_NO_TOKEN",
                { ipAddress: req.ip, userAgent: req.headers["user-agent"] },
                "warning"
            );
            return next(new AppError("Authentication required", StatusCodes.UNAUTHORIZED));
        }

        // Verify the token
        const decoded = verifyToken(token, TokenType.ACCESS);

        // Check if token type is correct
        if (decoded.type !== TokenType.ACCESS) {
            await loggingService.logSecurityEvent(
                decoded.userId,
                "AUTH_FAILED_INVALID_TOKEN_TYPE",
                {
                    tokenType: decoded.type,
                    expectedType: TokenType.ACCESS,
                    ipAddress: req.ip,
                    userAgent: req.headers["user-agent"],
                },
                "warning"
            );
            return next(new AppError("Invalid token type", StatusCodes.UNAUTHORIZED));
        }

        // If token contains an ID, verify it exists in the database and hasn't been invalidated
        if (decoded.tokenId) {
            const tokenRecord = await prisma.token.findUnique({
                where: { id: decoded.tokenId },
            });

            if (!tokenRecord || tokenRecord.invalidated) {
                await loggingService.logSecurityEvent(
                    decoded.userId,
                    "AUTH_FAILED_INVALIDATED_TOKEN",
                    {
                        tokenId: decoded.tokenId,
                        ipAddress: req.ip,
                        userAgent: req.headers["user-agent"],
                    },
                    "warning"
                );
                return next(new AppError("Token has been revoked", StatusCodes.UNAUTHORIZED));
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
        if (!user) {
            await loggingService.logSecurityEvent(
                decoded.userId,
                "AUTH_FAILED_USER_NOT_FOUND",
                {
                    ipAddress: req.ip,
                    userAgent: req.headers["user-agent"],
                },
                "warning"
            );
            return next(new AppError("User not found", StatusCodes.UNAUTHORIZED));
        }

        if (!user.isActive) {
            await loggingService.logSecurityEvent(
                user.id,
                "AUTH_FAILED_INACTIVE_USER",
                {
                    ipAddress: req.ip,
                    userAgent: req.headers["user-agent"],
                },
                "warning"
            );
            return next(new AppError("Account is inactive", StatusCodes.UNAUTHORIZED));
        }

        // Check if account is locked
        if (await securityService.isAccountLocked(user.id)) {
            await loggingService.logSecurityEvent(
                user.id,
                "AUTH_FAILED_LOCKED_ACCOUNT",
                {
                    ipAddress: req.ip,
                    userAgent: req.headers["user-agent"],
                },
                "warning"
            );
            return next(
                new AppError(
                    "Account is locked. Please try again later.",
                    StatusCodes.TOO_MANY_REQUESTS
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
        if (!user.lastLogin || Date.now() - user.lastLogin.getTime() > ONE_HOUR) {
            await prisma.user.update({
                where: { id: user.id },
                data: { lastLogin: new Date() },
            });
        }

        // Log successful authentication
        await loggingService.logAuditEvent(user.id, "AUTH_SUCCESS", "Authentication", {
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"],
            tokenId: decoded.tokenId,
        });

        next();
    } catch (error) {
        logger.debug(
            `Authentication error: ${error instanceof Error ? error.message : "Unknown error"}`
        );

        // Handle specific JWT errors
        if (error instanceof Error) {
            if (error.message === "Token expired") {
                await loggingService.logSecurityEvent(
                    req.user?.id,
                    "AUTH_FAILED_EXPIRED_TOKEN",
                    {
                        ipAddress: req.ip,
                        userAgent: req.headers["user-agent"],
                    },
                    "warning"
                );
                return next(
                    new AppError("Session expired, please login again", StatusCodes.UNAUTHORIZED)
                );
            } else if (error.message === "Invalid token") {
                await loggingService.logSecurityEvent(
                    req.user?.id,
                    "AUTH_FAILED_INVALID_TOKEN",
                    {
                        ipAddress: req.ip,
                        userAgent: req.headers["user-agent"],
                    },
                    "warning"
                );
                return next(new AppError("Invalid authentication token", StatusCodes.UNAUTHORIZED));
            }
        }

        await loggingService.logSecurityEvent(
            req.user?.id,
            "AUTH_FAILED_UNKNOWN",
            {
                error: error instanceof Error ? error.message : "Unknown error",
                ipAddress: req.ip,
                userAgent: req.headers["user-agent"],
            },
            "error"
        );

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
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        // Check if user exists (should be attached by authenticate middleware)
        if (!req.user) {
            return next(new AppError("Authentication required", StatusCodes.UNAUTHORIZED));
        }

        // Check if user's role is in the allowed roles list
        if (!allowedRoles.includes(req.user.role)) {
            await loggingService.logSecurityEvent(
                req.user.id,
                "AUTHZ_FAILED_INSUFFICIENT_PERMISSIONS",
                {
                    userRole: req.user.role,
                    requiredRoles: allowedRoles,
                    ipAddress: req.ip,
                    userAgent: req.headers["user-agent"],
                },
                "warning"
            );
            return next(new AppError("Insufficient permissions", StatusCodes.FORBIDDEN));
        }

        // Log successful authorization
        await loggingService.logAuditEvent(req.user.id, "AUTHZ_SUCCESS", "Authorization", {
            userRole: req.user.role,
            requiredRoles: allowedRoles,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"],
        });

        next();
    };
};

export default { authenticate, authorize };
