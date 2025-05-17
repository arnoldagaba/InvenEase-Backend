// src/utils/logger.ts
import winston from "winston";
import { Request } from "express";
import fs from "fs";
import path from "path";
import config from "../config/env.ts";

// Ensure log directory exists
const logDir = "logs";
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Define log level based on environment
const level = () => {
    const env = config.server.environment || "development";
    return env === "development" ? "debug" : "info";
};

// Define colors for each level
const colors = {
    error: "red",
    warn: "yellow",
    info: "green",
    http: "magenta",
    debug: "blue",
};

// Add colors to winston
winston.addColors(colors);

// Create a custom format for console output
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`
    )
);

// Create a custom format for file output (without colors)
const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.json()
);

// Create a custom format for request logging
const requestFormat = winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    return JSON.stringify({
        timestamp,
        level,
        message,
        ...meta,
    });
});

// Create the logger instance
const logger = winston.createLogger({
    level: level(),
    levels,
    format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.json()
    ),
    transports: [
        // Console transport
        new winston.transports.Console({ format: consoleFormat }),

        // Write all logs with level 'error' and below to 'error.log'
        new winston.transports.File({
            filename: path.join(logDir, "error.log"),
            level: "error",
            format: fileFormat,
        }),

        // Write all logs to 'combined.log'
        new winston.transports.File({
            filename: path.join(logDir, "combined.log"),
            format: fileFormat,
        }),
    ],
    exitOnError: false, // Do not exit on handled exceptions
});

// Create a stream object for Morgan
export const stream = {
    write: (message: string) => {
        logger.http(message.trim());
    },
};

// Function to log requests with additional metadata
export const logRequest = (req: Request, message: string = "API Request") => {
    logger.http({
        message,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userId: req.user?.id || "unauthenticated",
        userAgent: req.headers["user-agent"],
    });
};

// Function to log database operations
export const logDb = (operation: string, model: string, data: any = {}) => {
    logger.debug({
        message: `Database ${operation} on ${model}`,
        operation,
        model,
        data,
    });
};

export default logger;
