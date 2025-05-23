import { securityService } from "./security.service.ts";
import { loggingService } from "./logging.service.ts";
import logger from "../utils/logger.ts";
import config from "../config/env.ts";

class CleanupService {
    private cleanupInterval: NodeJS.Timeout | null = null;

    /**
     * Start the cleanup service
     */
    start(): void {
        if (this.cleanupInterval) {
            logger.warn("Cleanup service is already running");
            return;
        }

        const interval = this.parseTimeString(config.session.cleanupInterval);
        this.cleanupInterval = setInterval(() => this.runCleanup(), interval);
        logger.info("Cleanup service started");
    }

    /**
     * Stop the cleanup service
     */
    stop(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            logger.info("Cleanup service stopped");
        }
    }

    /**
     * Run all cleanup tasks
     */
    private async runCleanup(): Promise<void> {
        try {
            logger.debug("Starting cleanup tasks");

            // Clean up expired sessions and tokens
            await securityService.cleanupExpiredSessionsAndTokens();

            // Clean up old logs
            await loggingService.cleanupOldLogs();

            logger.debug("Cleanup tasks completed successfully");
        } catch (error) {
            logger.error("Error during cleanup tasks:", error);
        }
    }

    /**
     * Parse time string to milliseconds
     */
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

export const cleanupService = new CleanupService();
