import morgan from "morgan";
import { NextFunction, Request, Response } from "express";
import { stream } from "../utils/logger.ts";
import config from "../config/env.ts";

/**
 * Custom token for Morgan to get response time
 */
morgan.token("response-time", (req: Request) => {
    // @ts-expect-error - responseTime is added by morgan
    return req.responseTime ? `${req.responseTime}ms` : "0ms";
});

/**
 * Custom token for user ID (if available)
 */
morgan.token("user-id", (req: Request) => {
    return req.user?.id || "anonymous";
});

/**
 * Custom token for request body (be careful with sensitive data)
 */
morgan.token("request-body", (req: Request) => {
    // Filter out sensitive information before logging
    const filteredBody = { ...req.body };

    // List of sensitive fields that should not be logged
    const sensitiveFields = ["password", "token", "authorization"];

    // Mask sensitive fields with asterisks
    sensitiveFields.forEach((field) => {
        if (filteredBody[field]) {
            filteredBody[field] = "[REDACTED]";
        }
    });

    return JSON.stringify(filteredBody);
});

/**
 * Morgan format based on environment
 */
const morganFormat =
    config.server.environment === "production"
        ? "combined"
        : ":method :url :status :response-time - :user-id :remote-addr - :request-body";

/**
 * Morgan middleware that writes logs through Winston's stream
 */
export const morganMiddleware = morgan(morganFormat, { stream });

/**
 * Performance logging middleware to track request execution time
 */
export const requestPerformanceLogger = (req: Request, res: Response, next: NextFunction): void => {
    // Record start time
    const start = process.hrtime();

    // Once the request is finished
    res.on("finish", () => {
        // Calculate the execution time
        const diff = process.hrtime(start);
        const time = diff[0] * 1e3 + diff[1] * 1e-6; // Convert to milliseconds

        // Add response time to request object for morgan token
        // @ts-expect-error - adding responseTime property to Request type
        req.responseTime = time.toFixed(2);

        // Log slow requests (more than 1 second)
        if (time > 1000) {
            const message = `Slow request detected [${time.toFixed(2)}ms]: ${
                req.method
            } ${req.originalUrl}`;
            // Importing here to avoid circular dependency
            const logger = require("../utils/logger").default;
            logger.warn({
                message,
                method: req.method,
                url: req.originalUrl,
                responseTime: time.toFixed(2),
            });
        }
    });

    next();
};
