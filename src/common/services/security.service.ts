import { StatusCodes } from "http-status-codes";
import { PrismaClient, Token } from "../../generated/prisma/client.ts";
import { AppError } from "../utils/errorHandler.ts";
import logger from "../utils/logger.ts";
import config from "../config/env.ts";

class SecurityService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    /**
     * Check and handle failed login attempts
     */
    async handleFailedLoginAttempt(email: string): Promise<void> {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) return;

        const now = new Date();
        const windowStart = new Date(now.getTime() - this.getLoginAttemptWindowMs());

        // Get recent failed attempts
        const recentAttempts = await this.prisma.loginAttempt.count({
            where: {
                userId: user.id,
                success: false,
                createdAt: { gte: windowStart },
            },
        });

        // Record the failed attempt
        await this.prisma.loginAttempt.create({
            data: {
                userId: user.id,
                success: false,
                ipAddress: "IP_ADDRESS", // TODO: Pass IP from auth service
            },
        });

        // Check if we should lock the account
        if (recentAttempts + 1 >= config.security.maxLoginAttempts) {
            await this.lockAccount(user.id);
            throw new AppError(
                "Account locked due to too many failed attempts",
                StatusCodes.TOO_MANY_REQUESTS
            );
        }
    }

    /**
     * Handle successful login
     */
    async handleSuccessfulLogin(userId: string): Promise<void> {
        await this.prisma.loginAttempt.create({
            data: {
                userId,
                success: true,
                ipAddress: "IP_ADDRESS", // TODO: Pass IP from auth service
            },
        });

        // Clear failed attempts
        await this.prisma.loginAttempt.deleteMany({
            where: {
                userId,
                success: false,
            },
        });
    }

    /**
     * Lock an account
     */
    private async lockAccount(userId: string): Promise<void> {
        const lockoutExpiry = new Date(Date.now() + this.getAccountLockoutDurationMs());

        await this.prisma.user.update({
            where: { id: userId },
            data: {
                isLocked: true,
                lockoutExpiry,
            },
        });

        logger.warn(`Account ${userId} locked until ${lockoutExpiry}`);
    }

    /**
     * Check if account is locked
     */
    async isAccountLocked(userId: string): Promise<boolean> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { isLocked: true, lockoutExpiry: true },
        });

        if (!user?.isLocked) return false;

        // If lockout has expired, unlock the account
        if (user.lockoutExpiry && user.lockoutExpiry < new Date()) {
            await this.prisma.user.update({
                where: { id: userId },
                data: { isLocked: false, lockoutExpiry: null },
            });
            return false;
        }

        return true;
    }

    /**
     * Manage user sessions
     */
    async manageSessions(userId: string, newSessionId: string): Promise<void> {
        const sessions = await this.prisma.session.findMany({
            where: { userId },
            orderBy: { lastActive: "desc" },
        });

        // Remove old sessions if exceeding max concurrent sessions
        if (sessions.length >= config.security.maxConcurrentSessions) {
            const sessionsToRemove = sessions.slice(config.security.maxConcurrentSessions - 1);
            await this.prisma.session.deleteMany({
                where: {
                    id: { in: sessionsToRemove.map((s) => s.id) },
                },
            });
        }

        // Create new session
        await this.prisma.session.create({
            data: {
                id: newSessionId,
                userId,
                lastActive: new Date(),
            },
        });
    }

    /**
     * Rotate refresh token
     */
    async rotateRefreshToken(oldToken: Token, newToken: string, expiresAt: Date): Promise<void> {
        await this.prisma.$transaction([
            // Invalidate old token
            this.prisma.token.update({
                where: { id: oldToken.id },
                data: { invalidated: true },
            }),
            // Create new token
            this.prisma.token.create({
                data: {
                    token: newToken,
                    type: oldToken.type,
                    userId: oldToken.userId,
                    expiresAt,
                    lastUsed: new Date(),
                },
            }),
        ]);
    }

    /**
     * Clean up expired sessions and tokens
     */
    async cleanupExpiredSessionsAndTokens(): Promise<void> {
        const now = new Date();
        const inactiveThreshold = new Date(now.getTime() - this.getInactiveSessionTimeoutMs());

        await this.prisma.$transaction([
            // Delete expired sessions
            this.prisma.session.deleteMany({
                where: {
                    lastActive: { lt: inactiveThreshold },
                },
            }),
            // Delete expired tokens
            this.prisma.token.deleteMany({
                where: {
                    expiresAt: { lt: now },
                },
            }),
        ]);
    }

    // Helper methods to get configuration values in milliseconds
    private getLoginAttemptWindowMs(): number {
        return this.parseTimeString(config.security.loginAttemptWindow);
    }

    private getAccountLockoutDurationMs(): number {
        return this.parseTimeString(config.security.accountLockoutDuration);
    }

    private getInactiveSessionTimeoutMs(): number {
        return this.parseTimeString(config.session.inactiveTimeout);
    }

    private parseTimeString(timeString: string): number {
        const unit = timeString.slice(-1);
        const value = parseInt(timeString.slice(0, -1));
        switch (unit) {
            case "s":
                return value * 1000;
            case "m":
                return value * 60 * 1000;
            case "h":
                return value * 60 * 60 * 1000;
            case "d":
                return value * 24 * 60 * 60 * 1000;
            default:
                return value * 1000;
        }
    }
}

export const securityService = new SecurityService();
