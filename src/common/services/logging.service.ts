import { PrismaClient } from "@prisma/client";
import logger from "../utils/logger.ts";
import config from "../config/env.ts";

class LoggingService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    /**
     * Log security events
     */
    async logSecurityEvent(
        userId: string | undefined,
        event: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        details: Record<string, any>,
        severity: "info" | "warning" | "error" = "info"
    ): Promise<void> {
        if (!config.monitoring.enableSecurityLogs) return;

        try {
            await this.prisma.securityLog.create({
                data: {
                    userId,
                    event,
                    details,
                    severity,
                    ipAddress: details.ipAddress || null,
                    userAgent: details.userAgent || null,
                },
            });

            // Also log to console based on severity
            const logMessage = `Security Event: ${event} - User: ${userId || "anonymous"} - Details: ${JSON.stringify(details)}`;
            switch (severity) {
                case "error":
                    logger.error(logMessage);
                    break;
                case "warning":
                    logger.warn(logMessage);
                    break;
                default:
                    logger.info(logMessage);
            }
        } catch (error) {
            logger.error("Failed to log security event:", error);
        }
    }

    /**
     * Log audit events
     */
    async logAuditEvent(
        userId: string,
        action: string,
        resource: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        details: Record<string, any>
    ): Promise<void> {
        if (!config.monitoring.enableAuditLogs) return;

        try {
            await this.prisma.auditLog.create({
                data: {
                    userId,
                    action,
                    resource,
                    details,
                    ipAddress: details.ipAddress || null,
                    userAgent: details.userAgent || null,
                },
            });
        } catch (error) {
            logger.error("Failed to log audit event:", error);
        }
    }

    /**
     * Log suspicious activity
     */
    async logSuspiciousActivity(
        userId: string | undefined,
        activity: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        details: Record<string, any>
    ): Promise<void> {
        await this.logSecurityEvent(userId, activity, details, "warning");

        // Check if we've exceeded the suspicious activity threshold
        const recentActivities = await this.prisma.securityLog.count({
            where: {
                userId,
                severity: "warning",
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                },
            },
        });

        if (recentActivities >= config.monitoring.suspiciousActivityThreshold) {
            await this.logSecurityEvent(
                userId,
                "SUSPICIOUS_ACTIVITY_THRESHOLD_EXCEEDED",
                {
                    ...details,
                    recentActivities,
                    threshold: config.monitoring.suspiciousActivityThreshold,
                },
                "error"
            );
        }
    }

    /**
     * Clean up old logs
     */
    async cleanupOldLogs(): Promise<void> {
        const retentionPeriod = 30 * 24 * 60 * 60 * 1000; // 30 days
        const cutoffDate = new Date(Date.now() - retentionPeriod);

        await this.prisma.$transaction([
            this.prisma.securityLog.deleteMany({
                where: {
                    createdAt: { lt: cutoffDate },
                },
            }),
            this.prisma.auditLog.deleteMany({
                where: {
                    createdAt: { lt: cutoffDate },
                },
            }),
        ]);
    }
}

export const loggingService = new LoggingService();
