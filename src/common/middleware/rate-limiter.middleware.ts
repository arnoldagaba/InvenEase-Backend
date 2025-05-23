import rateLimit from "express-rate-limit";
import { Socket } from "socket.io";
import logger from "../utils/logger.ts";

// REST API Rate Limiter
export const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Socket.IO Rate Limiter
class SocketRateLimiter {
    private requests: Map<string, { count: number; resetTime: number }>;
    private readonly windowMs: number;
    private readonly maxRequests: number;

    constructor(windowMs = 60000, maxRequests = 100) {
        this.requests = new Map();
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;
    }

    public check(socket: Socket): boolean {
        const userId = socket.data.user?.id || socket.id;
        const now = Date.now();
        const userRequests = this.requests.get(userId);

        if (!userRequests || now > userRequests.resetTime) {
            // First request or window expired
            this.requests.set(userId, {
                count: 1,
                resetTime: now + this.windowMs,
            });
            return true;
        }

        if (userRequests.count >= this.maxRequests) {
            logger.warn(`Rate limit exceeded for user ${userId}`);
            return false;
        }

        userRequests.count++;
        return true;
    }

    public clear(): void {
        const now = Date.now();
        for (const [userId, data] of this.requests.entries()) {
            if (now > data.resetTime) {
                this.requests.delete(userId);
            }
        }
    }
}

// Create a singleton instance
export const socketRateLimiter = new SocketRateLimiter();

// Clean up expired entries every minute
setInterval(() => {
    socketRateLimiter.clear();
}, 60000);
